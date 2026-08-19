import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  ProValidationStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAddressDto,
  ReviewProfessionalDto,
  UpdateAdminUserDto,
  UpdateIndividualProfileDto,
  UpdateProfessionalProfileDto,
} from './dto/users.dto';
import { toSafeUser } from './user.mapper';

const userInclude = {
  individualProfile: true,
  professionalProfile: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toSafeUser(user);
  }

  async updateIndividualProfile(userId: string, dto: UpdateIndividualProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { individualProfile: true },
    });
    if (!user || user.role !== Role.CUSTOMER_INDIVIDUAL) {
      throw new ForbiddenException('Individual profile required');
    }
    if (!user.individualProfile) {
      throw new NotFoundException('Individual profile not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        locale: dto.locale,
        individualProfile: {
          update: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
      include: userInclude,
    });

    return toSafeUser(updated);
  }

  async updateProfessionalProfile(
    userId: string,
    dto: UpdateProfessionalProfileDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { professionalProfile: true },
    });
    if (!user || user.role !== Role.CUSTOMER_PRO) {
      throw new ForbiddenException('Professional profile required');
    }
    if (!user.professionalProfile) {
      throw new NotFoundException('Professional profile not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        locale: dto.locale,
        professionalProfile: {
          update: {
            companyName: dto.companyName,
            contactPerson: dto.contactPerson,
            sector: dto.sector,
            taxId: dto.taxId,
            ice: dto.ice,
            tradeRegister: dto.tradeRegister,
            billingAddress: dto.billingAddress,
          },
        },
      },
      include: userInclude,
    });

    return toSafeUser(updated);
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, type: dto.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        type: dto.type,
        label: dto.label,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        region: dto.region,
        postalCode: dto.postalCode,
        country: dto.country ?? 'MA',
        phone: dto.phone,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    await this.prisma.address.delete({ where: { id: addressId } });
    return { success: true };
  }

  async listPendingProfessionals() {
    return this.prisma.user.findMany({
      where: {
        role: Role.CUSTOMER_PRO,
        professionalProfile: {
          validationStatus: ProValidationStatus.PENDING,
        },
      },
      include: userInclude,
      orderBy: { createdAt: 'asc' },
    }).then((users) => users.map(toSafeUser));
  }

  async reviewProfessional(
    adminId: string,
    targetUserId: string,
    dto: ReviewProfessionalDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    if (dto.decision === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required when rejecting');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { professionalProfile: true },
    });

    if (!user || user.role !== Role.CUSTOMER_PRO || !user.professionalProfile) {
      throw new NotFoundException('Professional account not found');
    }

    if (user.professionalProfile.validationStatus !== ProValidationStatus.PENDING) {
      throw new BadRequestException('Professional account already reviewed');
    }

    const approved = dto.decision === 'APPROVED';
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: approved ? UserStatus.ACTIVE : UserStatus.BLOCKED,
        professionalProfile: {
          update: {
            validationStatus: approved
              ? ProValidationStatus.APPROVED
              : ProValidationStatus.REJECTED,
            validatedAt: new Date(),
            validatedById: adminId,
            rejectionReason: approved ? null : dto.rejectionReason,
          },
        },
      },
      include: userInclude,
    });

    await this.audit.log({
      userId: adminId,
      action: approved
        ? 'ADMIN_PRO_ACCOUNT_APPROVED'
        : 'ADMIN_PRO_ACCOUNT_REJECTED',
      entity: 'User',
      entityId: targetUserId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { decision: dto.decision, rejectionReason: dto.rejectionReason },
    });

    return toSafeUser(updated);
  }

  async setBlocked(
    adminId: string,
    targetUserId: string,
    blocked: boolean,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('Cannot block an admin account');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: blocked ? UserStatus.BLOCKED : UserStatus.ACTIVE },
      include: userInclude,
    });

    await this.audit.log({
      userId: adminId,
      action: blocked ? 'ADMIN_USER_BLOCKED' : 'ADMIN_USER_UNBLOCKED',
      entity: 'User',
      entityId: targetUserId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return toSafeUser(updated);
  }

  async listUsers(role?: Role) {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      include: {
        ...userInclude,
        _count: { select: { orders: true, quotes: true } },
        orders: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, number: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return users.map((user) => {
      const last = user.orders[0];
      const { orders: _orders, _count, ...rest } = user;
      return {
        ...toSafeUser(rest),
        _count,
        lastOrderAt: last?.createdAt ?? null,
        lastOrderNumber: last?.number ?? null,
      };
    });
  }

  async findOneAdmin(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        ...userInclude,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            currency: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            currency: true,
            destinationCountry: true,
            createdAt: true,
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            number: true,
            status: true,
            reason: true,
            createdAt: true,
            order: { select: { id: true, number: true } },
          },
        },
        _count: {
          select: {
            orders: true,
            quotes: true,
            returns: true,
            addresses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const spent = await this.prisma.order.aggregate({
      where: {
        userId: id,
        status: { notIn: [OrderStatus.CANCELLED] },
      },
      _sum: { total: true },
    });

    const {
      passwordHash: _passwordHash,
      orders,
      quotes,
      returns,
      addresses,
      _count,
      ...safe
    } = user;

    return {
      ...safe,
      addresses,
      _count,
      spentTotal: spent._sum.total?.toString() ?? '0',
      orders: orders.map((order) => ({
        ...order,
        total: order.total.toString(),
      })),
      quotes: quotes.map((quote) => ({
        ...quote,
        total: quote.total?.toString() ?? null,
      })),
      returns,
    };
  }

  async updateAdmin(
    adminId: string,
    targetUserId: string,
    dto: UpdateAdminUserDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
        locale: dto.locale,
        individualProfile:
          user.individualProfile && (dto.firstName || dto.lastName)
            ? {
                update: {
                  firstName: dto.firstName,
                  lastName: dto.lastName,
                },
              }
            : undefined,
        professionalProfile:
          user.professionalProfile &&
          (dto.companyName ||
            dto.contactPerson ||
            dto.sector ||
            dto.taxId ||
            dto.ice ||
            dto.tradeRegister ||
            dto.billingAddress)
            ? {
                update: {
                  companyName: dto.companyName,
                  contactPerson: dto.contactPerson,
                  sector: dto.sector,
                  taxId: dto.taxId,
                  ice: dto.ice,
                  tradeRegister: dto.tradeRegister,
                  billingAddress: dto.billingAddress,
                },
              }
            : undefined,
      },
      include: userInclude,
    });

    await this.audit.log({
      userId: adminId,
      action: 'ADMIN_USER_UPDATED',
      entity: 'User',
      entityId: targetUserId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.findOneAdmin(updated.id);
  }
}
