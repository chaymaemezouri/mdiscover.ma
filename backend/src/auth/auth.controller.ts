import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { LogoutDto } from '../users/dto/users.dto';
import { AuthService } from './auth.service';
import { CompleteGoogleProfessionalDto } from './dto/complete-google-professional.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterIndividualDto } from './dto/register-individual.dto';
import { RegisterProfessionalDto } from './dto/register-professional.dto';

type RefreshAuthUser = AuthUser & { refreshToken: string };

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/individual')
  registerIndividual(@Body() dto: RegisterIndividualDto, @Req() req: Request) {
    return this.authService.registerIndividual(dto, this.meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/professional')
  registerProfessional(
    @Body() dto: RegisterProfessionalDto,
    @Req() req: Request,
  ) {
    return this.authService.registerProfessional(dto, this.meta(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.meta(req));
  }

  @Public()
  @Get('providers')
  providers() {
    return this.authService.providers();
  }

  @Public()
  @Get('google')
  async google(@Query('next') next: string | undefined, @Res() res: Response) {
    const url = await this.authService.googleAuthorizationUrl(next);
    return res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(
        this.authService.googleFrontendCallback(undefined, error),
      );
    }
    try {
      const exchangeCode = await this.authService.completeGoogleLogin(
        code,
        state,
        this.meta(req),
      );
      return res.redirect(
        this.authService.googleFrontendCallback(exchangeCode),
      );
    } catch (err) {
      this.logger.warn(
        `Google callback failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return res.redirect(
        this.authService.googleFrontendCallback(undefined, 'google'),
      );
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google/exchange')
  googleExchange(@Body('code') code: string) {
    return this.authService.exchangeGoogleCode(code);
  }

  @HttpCode(HttpStatus.OK)
  @Post('google/complete-professional')
  completeGoogleProfessional(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteGoogleProfessionalDto,
    @Req() req: Request,
  ) {
    return this.authService.completeGoogleProfessional(
      user.id,
      dto,
      this.meta(req),
    );
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(
    @CurrentUser() user: RefreshAuthUser,
    @Body() _dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    return this.authService.refresh(user.id, user.refreshToken, this.meta(req));
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(
    @CurrentUser() user: AuthUser,
    @Body() body: LogoutDto,
    @Req() req: Request,
  ) {
    return this.authService.logout(user.id, body?.refreshToken, this.meta(req));
  }

  private meta(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
