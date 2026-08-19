export function isNewArrival(product: {
  isNew?: boolean | null;
  createdAt?: string | Date | null;
}): boolean {
  return Boolean(product.isNew);
}
