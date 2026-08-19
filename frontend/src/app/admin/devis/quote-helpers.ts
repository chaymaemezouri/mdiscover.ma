import type { QuoteSummary } from '@/lib/api';

export function companyOf(quote: QuoteSummary) {
  return (
    quote.companyName ||
    quote.user?.professionalProfile?.companyName ||
    quote.contactName ||
    quote.user?.email ||
    'Client pro'
  );
}

export function lineName(item: NonNullable<QuoteSummary['items']>[number]) {
  return item.nameFr || item.product?.nameFr || item.sku || 'Article';
}

export function defaultValidity() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}
