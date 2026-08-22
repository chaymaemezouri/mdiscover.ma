import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Locale, ProValidationStatus, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { toSafeUser } from '../users/user.mapper';
import { CompleteGoogleProfessionalDto } from './dto/complete-google-professional.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterIndividualDto } from './dto/register-individual.dto';
import { RegisterProfessionalDto } from './dto/register-professional.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleExchanges = new Map<
    string,
    {
      result: Awaited<ReturnType<AuthService['issueTokens']>>;
      next: string;
      expiresAt: number;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async registerIndividual(dto: RegisterIndividualDto, meta?: RequestMeta) {
    await this.ensureEmailAvailable(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: Role.CUSTOMER_INDIVIDUAL,
        status: UserStatus.ACTIVE,
        locale: dto.locale ?? Locale.FR,
        individualProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: 'AUTH_REGISTER_INDIVIDUAL',
      entity: 'User',
      entityId: user.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    void this.mail.sendWelcome(
      user.email,
      `${dto.firstName} ${dto.lastName}`.trim(),
    );

    return this.issueTokens(user, meta);
  }

  async registerProfessional(dto: RegisterProfessionalDto, meta?: RequestMeta) {
    await this.ensureEmailAvailable(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: Role.CUSTOMER_PRO,
        status: UserStatus.PENDING_VERIFICATION,
        locale: dto.locale ?? Locale.FR,
        professionalProfile: {
          create: {
            companyName: dto.companyName,
            contactPerson: dto.contactPerson,
            sector: dto.sector,
            taxId: dto.taxId,
            ice: dto.ice,
            tradeRegister: dto.tradeRegister,
            billingAddress: dto.billingAddress,
            documentUrls: dto.documentUrls ?? [],
            validationStatus: ProValidationStatus.PENDING,
          },
        },
      },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: 'AUTH_REGISTER_PROFESSIONAL',
      entity: 'User',
      entityId: user.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    void this.mail.sendWelcome(user.email, dto.contactPerson || dto.companyName);

    return this.issueTokens(user, meta);
  }

  async login(dto: LoginDto, meta?: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.audit.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entity: 'User',
        entityId: user.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.issueTokens(user, meta);
  }

  providers() {
    return {
      google: Boolean(
        this.config.get<string>('GOOGLE_CLIENT_ID') &&
        this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      ),
      apple: false,
    };
  }

  async googleAuthorizationUrl(next?: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google authentication is not configured');
    }

    const safeNext =
      next?.startsWith('/') && !next.startsWith('//') ? next : '/compte';
    const state = await this.jwt.signAsync(
      { kind: 'google_oauth', next: safeNext },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
      },
    );
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.googleCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async completeGoogleLogin(code: string, state: string, meta?: RequestMeta) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google authentication is not configured');
    }

    const statePayload = await this.jwt.verifyAsync<{
      kind: string;
      next?: string;
    }>(state, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    if (statePayload.kind !== 'google_oauth') {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.googleCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => '');
      this.logger.warn(
        `Google token exchange failed (${tokenResponse.status}): ${detail.slice(0, 300)}`,
      );
      throw new UnauthorizedException('Google authentication failed');
    }
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!tokenPayload.access_token) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } },
    );
    if (!profileResponse.ok) {
      throw new UnauthorizedException('Google profile unavailable');
    }
    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
    };
    if (!profile.sub || !profile.email || profile.email_verified !== true) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const email = profile.email.toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });
    if (user?.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    if (!user) {
      const fullName = profile.name?.trim() || email.split('@')[0];
      const firstName =
        profile.given_name?.trim() || fullName.split(/\s+/)[0] || 'Client';
      const lastName =
        profile.family_name?.trim() ||
        fullName.split(/\s+/).slice(1).join(' ') ||
        'Discover';
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS),
          role: Role.CUSTOMER_INDIVIDUAL,
          status: UserStatus.ACTIVE,
          individualProfile: { create: { firstName, lastName } },
        },
        include: {
          individualProfile: true,
          professionalProfile: true,
        },
      });
      void this.mail.sendWelcome(user.email, `${firstName} ${lastName}`.trim());
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: {
          individualProfile: true,
          professionalProfile: true,
        },
      });
    }

    await this.audit.log({
      userId: user.id,
      action: 'AUTH_LOGIN_GOOGLE',
      entity: 'User',
      entityId: user.id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { googleSubject: profile.sub },
    });

    const result = await this.issueTokens(user, meta);
    const exchangeCode = randomUUID();
    const next =
      statePayload.next?.startsWith('/') && !statePayload.next.startsWith('//')
        ? statePayload.next
        : '/compte';
    this.googleExchanges.set(exchangeCode, {
      result,
      next,
      expiresAt: Date.now() + 2 * 60_000,
    });
    return exchangeCode;
  }

  exchangeGoogleCode(code: string) {
    const key = code?.trim();
    if (!key) {
      throw new UnauthorizedException('OAuth exchange code missing');
    }
    const exchange = this.googleExchanges.get(key);
    if (!exchange || exchange.expiresAt < Date.now()) {
      this.googleExchanges.delete(key);
      throw new UnauthorizedException('OAuth exchange code expired');
    }
    return { ...exchange.result, next: exchange.next };
  }

  async completeGoogleProfessional(
    userId: string,
    dto: CompleteGoogleProfessionalDto,
    meta?: RequestMeta,
  ) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });
    if (!current) throw new UnauthorizedException('User not found');
    if (current.role === Role.ADMIN || current.role === Role.DEVELOPER) {
      throw new ForbiddenException('Account type cannot be changed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          role: Role.CUSTOMER_PRO,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });
      if (current.individualProfile) {
        await tx.individualProfile.delete({ where: { userId } });
      }
      await tx.professionalProfile.upsert({
        where: { userId },
        create: {
          userId,
          companyName: dto.companyName.trim(),
          contactPerson: dto.contactPerson.trim(),
          sector: dto.sector?.trim() || null,
          ice: dto.ice?.trim() || null,
          billingAddress: dto.city?.trim() || null,
          validationStatus: ProValidationStatus.PENDING,
        },
        update: {
          companyName: dto.companyName.trim(),
          contactPerson: dto.contactPerson.trim(),
          sector: dto.sector?.trim() || null,
          ice: dto.ice?.trim() || null,
          billingAddress: dto.city?.trim() || null,
          validationStatus: ProValidationStatus.PENDING,
        },
      });
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        individualProfile: true,
        professionalProfile: true,
      },
    });
    await this.audit.log({
      userId,
      action: 'AUTH_GOOGLE_COMPLETE_PROFESSIONAL',
      entity: 'User',
      entityId: userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return this.issueTokens(user, meta);
  }

  googleFrontendCallback(code?: string, error?: string) {
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const target = new URL('/connexion', frontend);
    if (code) {
      target.searchParams.set('oauth', 'google');
      target.searchParams.set('code', code);
    } else {
      target.searchParams.set('oauthError', error || 'google');
    }
    return target.toString();
  }

  async refresh(userId: string, refreshToken: string, meta?: RequestMeta) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            individualProfile: true,
            professionalProfile: true,
          },
        },
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      userId,
      action: 'AUTH_TOKEN_REFRESH',
      entity: 'User',
      entityId: userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.issueTokens(stored.user, meta);
  }

  async logout(userId: string, refreshToken?: string, meta?: RequestMeta) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.log({
      userId,
      action: 'AUTH_LOGOUT',
      entity: 'User',
      entityId: userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { success: true };
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      role: Role;
      status: UserStatus;
      phone: string | null;
      locale: Locale;
      lastLoginAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      passwordHash: string;
      individualProfile?: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
      professionalProfile?: {
        id: string;
        companyName: string;
        sector: string | null;
        taxId: string | null;
        ice: string | null;
        tradeRegister: string | null;
        contactPerson: string;
        billingAddress: string | null;
        documentUrls: string[];
        validationStatus: ProValidationStatus;
        validatedAt: Date | null;
        rejectionReason: string | null;
      } | null;
    },
    meta?: RequestMeta,
  ) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
      user: toSafeUser(user),
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private googleCallbackUrl() {
    const configured = this.config.get<string>('GOOGLE_CALLBACK_URL');
    if (configured) return configured;
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const prefix = this.config.get<string>('API_PREFIX', 'api/v1');
    return `${appUrl.replace(/\/$/, '')}/${prefix.replace(/^\/|\/$/g, '')}/auth/google/callback`;
  }

  private addDuration(from: Date, duration: string): Date {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new BadRequestException(`Invalid duration: ${duration}`);
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's'
        ? amount * 1000
        : unit === 'm'
          ? amount * 60_000
          : unit === 'h'
            ? amount * 3_600_000
            : amount * 86_400_000;
    return new Date(from.getTime() + ms);
  }
}

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
};
