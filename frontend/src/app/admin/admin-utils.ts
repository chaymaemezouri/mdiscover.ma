export function formatAdminDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-MA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatAdminDay(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-MA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toneForStatus(status: string) {
  const s = status.toUpperCase();
  if (
    [
      'PAID',
      'DELIVERED',
      'SUCCEEDED',
      'APPROVED',
      'ACCEPTED',
      'CONVERTED',
      'ACTIVE',
      'SENT',
      'CONFIRMED',
      'READ',
    ].includes(s)
  ) {
    return 'ok';
  }
  if (
    [
      'CANCELLED',
      'FAILED',
      'REJECTED',
      'BLOCKED',
      'REFUNDED',
      'RETURNED',
      'ARCHIVED',
    ].includes(s)
  ) {
    return 'warn';
  }
  if (
    [
      'PENDING_PAYMENT',
      'PENDING',
      'AWAITING_PROOF',
      'PROOF_SUBMITTED',
      'REQUESTED',
      'IN_REVIEW',
      'UNDER_REVIEW',
      'PROCESSING',
      'NEW',
    ].includes(s)
  ) {
    return 'info';
  }
  return 'mute';
}
