import type { OrderSummary } from '@/lib/api';

export type OrderFilterId =
  | 'all'
  | 'pay'
  | 'prep'
  | 'ship'
  | 'route'
  | 'done'
  | 'issue';

export const ORDER_FILTERS: Array<{
  id: OrderFilterId;
  label: string;
  match: (status: string) => boolean;
}> = [
  { id: 'all', label: 'Toutes', match: () => true },
  {
    id: 'pay',
    label: 'À encaisser',
    match: (s) => s === 'PENDING_PAYMENT',
  },
  {
    id: 'prep',
    label: 'À traiter',
    match: (s) => ['PAID', 'CONFIRMED', 'PREPARING'].includes(s),
  },
  {
    id: 'ship',
    label: 'À expédier',
    match: (s) => s === 'READY_TO_SHIP',
  },
  {
    id: 'route',
    label: 'En livraison',
    match: (s) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(s),
  },
  { id: 'done', label: 'Livrées', match: (s) => s === 'DELIVERED' },
  {
    id: 'issue',
    label: 'Incidents',
    match: (s) => ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(s),
  },
];

export const ORDER_ACTION_LABEL: Record<string, string> = {
  PAID: 'Marquer payée',
  CONFIRMED: 'Confirmer',
  PREPARING: 'Mettre en préparation',
  READY_TO_SHIP: 'Prête à expédier',
  SHIPPED: 'Expédier',
  OUT_FOR_DELIVERY: 'Mettre en livraison',
  DELIVERED: 'Marquer livrée',
  CANCELLED: 'Annuler',
  RETURNED: 'Marquer retournée',
  REFUNDED: 'Marquer remboursée',
};

export function clientName(order: OrderSummary) {
  const pro = order.user?.professionalProfile;
  const ind = order.user?.individualProfile;
  if (pro?.companyName) return pro.companyName;
  if (ind) return `${ind.firstName} ${ind.lastName}`.trim();
  return order.user?.email ?? 'Client';
}

export function formatAddress(
  addr?: OrderSummary['shippingAddressSnap'] | null,
) {
  if (!addr) return '—';
  return [
    addr.line1,
    addr.line2,
    [addr.postalCode, addr.city].filter(Boolean).join(' '),
    addr.region,
    addr.country,
  ]
    .filter(Boolean)
    .join(', ');
}
