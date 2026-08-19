import type { AdminClient } from '@/lib/api';

export type ClientFilterId =
  | 'all'
  | 'pro'
  | 'individual'
  | 'pending'
  | 'blocked'
  | 'staff';

export const CLIENT_FILTERS: Array<{
  id: ClientFilterId;
  label: string;
  match: (user: AdminClient) => boolean;
}> = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'pro', label: 'Pros', match: (u) => u.role === 'CUSTOMER_PRO' },
  {
    id: 'individual',
    label: 'Particuliers',
    match: (u) => u.role === 'CUSTOMER_INDIVIDUAL',
  },
  {
    id: 'pending',
    label: 'En attente',
    match: (u) =>
      u.role === 'CUSTOMER_PRO' &&
      u.professionalProfile?.validationStatus === 'PENDING',
  },
  { id: 'blocked', label: 'Bloqués', match: (u) => u.status === 'BLOCKED' },
  {
    id: 'staff',
    label: 'Équipe',
    match: (u) => u.role === 'ADMIN' || u.role === 'DEVELOPER',
  },
];

export function clientDisplayName(user: {
  email: string;
  individualProfile?: { firstName?: string; lastName?: string } | null;
  professionalProfile?: { companyName?: string } | null;
}) {
  const company = user.professionalProfile?.companyName?.trim();
  if (company) return company;
  const person = [
    user.individualProfile?.firstName,
    user.individualProfile?.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  return person || user.email;
}

export function clientInitials(user: {
  email: string;
  individualProfile?: { firstName?: string; lastName?: string } | null;
  professionalProfile?: { companyName?: string; contactPerson?: string } | null;
}) {
  const name = clientDisplayName(user);
  if (name.includes('@')) return name.slice(0, 2).toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function formatAddressLine(address?: {
  label?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
} | null) {
  if (!address) return '—';
  return [
    address.label,
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.region,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}
