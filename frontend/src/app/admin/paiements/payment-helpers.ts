import type { PaymentRecord } from '@/lib/api';
import { statusLabel } from '@/lib/api';

export function payLabel(status: PaymentRecord['status']) {
  return statusLabel(status);
}

export function paymentClientName(payment: PaymentRecord) {
  const user = payment.order?.user;
  const pro = user?.professionalProfile;
  const ind = user?.individualProfile;
  if (pro?.companyName) return pro.companyName;
  if (ind) return `${ind.firstName} ${ind.lastName}`.trim();
  return user?.email ?? 'Client';
}

export function isImageProof(url?: string | null) {
  return Boolean(url && /\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i.test(url));
}

export function bankDetails(payment: PaymentRecord) {
  const meta = payment.metadata as
    | { bankDetails?: Record<string, string | number> }
    | null
    | undefined;
  return meta?.bankDetails ?? null;
}
