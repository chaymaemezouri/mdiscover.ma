import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminRejectPaymentDto,
  CmiCallbackDto,
  InitiatePaymentDto,
  SubmitPaymentProofDto,
  UpsertPaymentSettingDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  async listMethods() {
    const settings = await this.prisma.paymentSetting.findMany({
      orderBy: { provider: 'asc' },
    });
    return settings.map((s) => ({
      provider: s.provider,
      isEnabled: s.isEnabled,
      labelFr: s.labelFr,
      labelEn: s.labelEn,
      ready:
        s.provider === PaymentMethod.BANK_TRANSFER ||
        s.provider === PaymentMethod.COD
          ? s.isEnabled
          : false,
    }));
  }

  async listForOrder(orderId: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId && role !== Role.ADMIN && role !== Role.DEVELOPER) {
      throw new ForbiddenException('Not your order');
    }
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(status?: PaymentStatus) {
    const rows = await this.prisma.payment.findMany({
      where: status ? { status } : undefined,
      include: {
        order: {
          select: {
            id: true,
            number: true,
            status: true,
            userId: true,
            paymentMethod: true,
            total: true,
            currency: true,
            user: {
              select: {
                email: true,
                phone: true,
                individualProfile: { select: { firstName: true, lastName: true } },
                professionalProfile: {
                  select: { companyName: true, contactPerson: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      order: row.order
        ? {
            ...row.order,
            total: Number(row.order.total),
          }
        : null,
    }));
  }

  async findOneAdmin(paymentId: string) {
    const row = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            status: true,
            userId: true,
            paymentMethod: true,
            total: true,
            currency: true,
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                individualProfile: { select: { firstName: true, lastName: true } },
                professionalProfile: {
                  select: { companyName: true, contactPerson: true },
                },
              },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Payment not found');
    }
    return {
      ...row,
      amount: Number(row.amount),
      order: row.order
        ? {
            ...row.order,
            total: Number(row.order.total),
          }
        : null,
    };
  }

  async listSettings() {
    return this.prisma.paymentSetting.findMany({
      orderBy: { provider: 'asc' },
    });
  }

  async initiateCmi(userId: string, dto: InitiatePaymentDto) {
    await this.assertProviderEnabled(PaymentMethod.CMI);
    const order = await this.getPayableOrder(dto.orderId, userId);

    if (order.paymentMethod !== PaymentMethod.CMI) {
      throw new BadRequestException('Order payment method is not CMI');
    }

    const payment = await this.createPendingPayment(
      order.id,
      PaymentMethod.CMI,
      Number(order.total),
      order.currency,
      PaymentStatus.PROCESSING,
    );

    const storeKey = this.config.get<string>('CMI_STORE_KEY', 'cmi_test_store_key');
    const clientId = this.config.get<string>('CMI_CLIENT_ID', 'mdiscover_test');
    const gatewayUrl = this.config.get<string>(
      'CMI_GATEWAY_URL',
      'https://testpayment.cmi.co.ma/fim/est3Dgate',
    );
    const okUrl = `${this.config.get('APP_URL')}/api/v1/payments/cmi/return?paymentId=${payment.id}`;
    const failUrl = `${this.config.get('APP_URL')}/api/v1/payments/cmi/return?paymentId=${payment.id}&failed=1`;
    const callbackUrl = `${this.config.get('APP_URL')}/api/v1/payments/cmi/callback`;

    const amount = Number(order.total).toFixed(2);
    const rnd = randomUUID().slice(0, 12);
    const hashBase = `${clientId}|${order.number}|${amount}|${okUrl}|${failUrl}|${rnd}|${storeKey}`;
    const hash = createHash('sha512').update(hashBase).digest('hex');

    const formFields = {
      clientid: clientId,
      amount,
      oid: order.number,
      okUrl,
      failUrl,
      callbackUrl,
      currency: '504', // MAD ISO numeric
      rnd,
      hash,
      storetype: '3D_PAY_HOSTING',
      hashAlgorithm: 'ver3',
      lang: 'fr',
      BillToName: order.userId,
      email: '',
      paymentId: payment.id,
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: rnd,
        metadata: { formFields, gatewayUrl, mode: 'CMI_STUB' },
      },
    });

    await this.audit.log({
      userId,
      action: 'PAYMENT_CMI_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { orderId: order.id, amount },
    });

    return {
      paymentId: payment.id,
      provider: PaymentMethod.CMI,
      status: PaymentStatus.PROCESSING,
      gatewayUrl,
      formFields,
      note: 'CMI stub ready — replace credentials with real CMI contract values',
    };
  }

  async handleCmiCallback(dto: CmiCallbackDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { order: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return { ok: true, alreadyProcessed: true };
    }

    const success =
      dto.ProcReturnCode === '00' ||
      dto.Response === 'Approved' ||
      dto.HASH === 'SIMULATE_SUCCESS';

    if (!success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: dto.Response ?? 'CMI payment failed',
          providerRef: dto.TransId ?? payment.providerRef,
        },
      });
      await this.audit.log({
        action: 'PAYMENT_CMI_FAILED',
        entity: 'Payment',
        entityId: payment.id,
        metadata: { response: dto.Response, code: dto.ProcReturnCode },
      });
      return { ok: false };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
        providerRef: dto.TransId ?? payment.providerRef,
        metadata: {
          ...(typeof payment.metadata === 'object' && payment.metadata
            ? (payment.metadata as Record<string, unknown>)
            : {}),
          callback: { ...dto },
        } as Prisma.InputJsonValue,
      },
    });

    if (payment.order.status === OrderStatus.PENDING_PAYMENT) {
      await this.orders.markAsPaid(
        payment.orderId,
        null,
        `CMI payment ${dto.TransId ?? payment.id}`,
      );
    }

    await this.audit.log({
      action: 'PAYMENT_CMI_SUCCEEDED',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { orderId: payment.orderId },
    });

    return { ok: true };
  }

  async cmiReturn(paymentId: string, failed?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { select: { id: true, number: true, status: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      paymentId: payment.id,
      status: failed ? PaymentStatus.FAILED : payment.status,
      order: payment.order,
    };
  }

  /** Dev helper: simulate successful CMI callback without real gateway */
  async simulateCmiSuccess(paymentId: string, userId: string) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.order.userId !== userId) {
      throw new ForbiddenException('Not your payment');
    }
    return this.handleCmiCallback({
      paymentId,
      orderNumber: payment.order.number,
      amount: Number(payment.amount).toFixed(2),
      ProcReturnCode: '00',
      Response: 'Approved',
      TransId: `SIM-${Date.now()}`,
      HASH: 'SIMULATE_SUCCESS',
    });
  }

  async initiateBankTransfer(userId: string, dto: InitiatePaymentDto) {
    await this.assertProviderEnabled(PaymentMethod.BANK_TRANSFER);
    const order = await this.getPayableOrder(dto.orderId, userId);

    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Order payment method is not BANK_TRANSFER');
    }

    const payment = await this.createPendingPayment(
      order.id,
      PaymentMethod.BANK_TRANSFER,
      Number(order.total),
      order.currency,
      PaymentStatus.AWAITING_PROOF,
    );

    const bankDetails = {
      bankName: await this.settingOrEnv('bank.bankName', 'BANK_NAME', 'Banque Populaire'),
      iban: await this.settingOrEnv('bank.iban', 'BANK_IBAN', 'MA640007XXXXXXXXXXXXXX'),
      rib: await this.settingOrEnv('bank.rib', 'BANK_RIB', '007XXXXXXXXXXXXXX'),
      accountName: await this.settingOrEnv(
        'bank.accountName',
        'BANK_ACCOUNT_NAME',
        'Mdiscover Impex Food',
      ),
      reference: order.number,
      amount: Number(order.total),
      currency: order.currency,
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { metadata: { bankDetails } },
    });

    await this.audit.log({
      userId,
      action: 'PAYMENT_BANK_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
    });

    return {
      paymentId: payment.id,
      provider: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.AWAITING_PROOF,
      bankDetails,
      instructions:
        'Effectuez le virement avec la référence commande, puis déposez le justificatif.',
    };
  }

  async submitProof(
    paymentId: string,
    userId: string,
    dto: SubmitPaymentProofDto,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.order.userId !== userId) {
      throw new ForbiddenException('Not your payment');
    }
    if (payment.provider !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Proof only for bank transfer');
    }
    const proofStatuses: PaymentStatus[] = [
      PaymentStatus.AWAITING_PROOF,
      PaymentStatus.FAILED,
    ];
    if (!proofStatuses.includes(payment.status)) {
      throw new BadRequestException('Cannot submit proof in this status');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofUrl: dto.proofUrl,
        status: PaymentStatus.PROOF_SUBMITTED,
        failureReason: null,
      },
    });

    await this.audit.log({
      userId,
      action: 'PAYMENT_PROOF_SUBMITTED',
      entity: 'Payment',
      entityId: paymentId,
      metadata: { note: dto.note },
    });

    return updated;
  }

  async confirmBankPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.provider !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Not a bank transfer payment');
    }
    const confirmable: PaymentStatus[] = [
      PaymentStatus.PROOF_SUBMITTED,
      PaymentStatus.AWAITING_PROOF,
    ];
    if (!confirmable.includes(payment.status)) {
      throw new BadRequestException(
        'Ce paiement ne peut pas être confirmé dans cet état',
      );
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
        confirmedBy: adminId,
      },
    });

    if (payment.order.status === OrderStatus.PENDING_PAYMENT) {
      await this.orders.markAsPaid(
        payment.orderId,
        adminId,
        'Bank transfer confirmed by admin',
      );
    }

    await this.audit.log({
      userId: adminId,
      action: 'PAYMENT_BANK_CONFIRMED',
      entity: 'Payment',
      entityId: paymentId,
    });

    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  async confirmCodPayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.provider !== PaymentMethod.COD) {
      throw new BadRequestException('Not a cash-on-delivery payment');
    }
    const confirmable: PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.PROCESSING,
    ];
    if (!confirmable.includes(payment.status)) {
      throw new BadRequestException(
        'Ce paiement COD ne peut pas être encaissé dans cet état',
      );
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(),
        confirmedBy: adminId,
      },
    });

    if (payment.order.status === OrderStatus.PENDING_PAYMENT) {
      await this.orders.markAsPaid(
        payment.orderId,
        adminId,
        'Cash on delivery collected by admin',
      );
    }

    await this.audit.log({
      userId: adminId,
      action: 'PAYMENT_COD_CONFIRMED',
      entity: 'Payment',
      entityId: paymentId,
    });

    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  async rejectBankPayment(
    paymentId: string,
    adminId: string,
    dto: AdminRejectPaymentDto,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.provider !== PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('Not a bank transfer payment');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: dto.reason,
        confirmedBy: adminId,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'PAYMENT_BANK_REJECTED',
      entity: 'Payment',
      entityId: paymentId,
      metadata: { reason: dto.reason },
    });

    return updated;
  }

  async initiateStripe(_userId: string, _dto: InitiatePaymentDto) {
    await this.assertProviderEnabled(PaymentMethod.STRIPE);
    throw new ServiceUnavailableException(
      'Stripe is configured as stub only — not active yet',
    );
  }

  async initiateCod(userId: string, dto: InitiatePaymentDto) {
    await this.assertProviderEnabled(PaymentMethod.COD);
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.paymentMethod !== PaymentMethod.COD) {
      throw new BadRequestException('Order payment method is not COD');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, provider: PaymentMethod.COD },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        paymentId: existing.id,
        provider: PaymentMethod.COD,
        status: existing.status,
      };
    }

    const payment = await this.createPendingPayment(
      order.id,
      PaymentMethod.COD,
      Number(order.total),
      order.currency,
      PaymentStatus.PENDING,
    );

    await this.audit.log({
      userId,
      action: 'PAYMENT_COD_INITIATED',
      entity: 'Payment',
      entityId: payment.id,
    });

    return {
      paymentId: payment.id,
      provider: PaymentMethod.COD,
      status: PaymentStatus.PENDING,
    };
  }

  async upsertSetting(dto: UpsertPaymentSettingDto, adminId: string) {
    const setting = await this.prisma.paymentSetting.upsert({
      where: { provider: dto.provider },
      create: {
        provider: dto.provider,
        isEnabled: dto.isEnabled,
        labelFr: dto.labelFr,
        labelEn: dto.labelEn,
      },
      update: {
        isEnabled: dto.isEnabled,
        labelFr: dto.labelFr,
        labelEn: dto.labelEn,
      },
    });
    await this.audit.log({
      userId: adminId,
      action: 'PAYMENT_SETTING_UPDATED',
      entity: 'PaymentSetting',
      entityId: setting.id,
      metadata: { provider: dto.provider, isEnabled: dto.isEnabled },
    });
    return setting;
  }

  private async assertProviderEnabled(provider: PaymentMethod) {
    const setting = await this.prisma.paymentSetting.findUnique({
      where: { provider },
    });
    if (!setting?.isEnabled) {
      throw new BadRequestException(`Payment provider ${provider} is disabled`);
    }
    if (provider === PaymentMethod.STRIPE) {
      return;
    }
  }

  private async getPayableOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new ForbiddenException('Not your order');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }
    const existingSuccess = await this.prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.SUCCEEDED },
    });
    if (existingSuccess) {
      throw new BadRequestException('Order already paid');
    }
    return order;
  }

  private async createPendingPayment(
    orderId: string,
    provider: PaymentMethod,
    amount: number,
    currency: string,
    status: PaymentStatus,
  ) {
    return this.prisma.payment.create({
      data: {
        orderId,
        provider,
        amount,
        currency,
        status,
      },
    });
  }

  private async ensureDefaultSettings() {
    const defaults: Array<{
      provider: PaymentMethod;
      isEnabled: boolean;
      labelFr: string;
      labelEn: string;
    }> = [
      {
        provider: PaymentMethod.CMI,
        isEnabled: false,
        labelFr: 'Carte bancaire (CMI)',
        labelEn: 'Bank card (CMI)',
      },
      {
        provider: PaymentMethod.BANK_TRANSFER,
        isEnabled: true,
        labelFr: 'Paiement bancaire',
        labelEn: 'Bank payment',
      },
      {
        provider: PaymentMethod.STRIPE,
        isEnabled: false,
        labelFr: 'Stripe',
        labelEn: 'Stripe',
      },
      {
        provider: PaymentMethod.COD,
        isEnabled: true,
        labelFr: 'Paiement à la livraison',
        labelEn: 'Cash on delivery',
      },
    ];

    for (const row of defaults) {
      await this.prisma.paymentSetting.upsert({
        where: { provider: row.provider },
        create: row,
        update: {},
      });
    }
  }

  private async settingOrEnv(key: string, envKey: string, fallback: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    const fromDb = setting?.value?.trim();
    if (fromDb) return fromDb;
    return this.config.get(envKey, fallback);
  }
}
