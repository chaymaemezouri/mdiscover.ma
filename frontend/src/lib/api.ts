export type ProductListItem = {
  id: string;
  sku: string;
  slugFr: string;
  slugEn: string;
  nameFr: string;
  nameEn: string;
  price: string | number;
  promoPrice?: string | number | null;
  currency: string;
  stockQty: number;
  originCountry?: string | null;
  packaging?: string | null;
  unitsPerCarton?: number | null;
  purchaseMode?: 'DIRECT' | 'QUOTE' | 'HYBRID';
  hybridThresholdQty?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  ratingsAvg?: string | number;
  ratingsCount?: number;
  images?: Array<{
    id?: string;
    url: string;
    isPrimary?: boolean;
    altFr?: string | null;
  }>;
  category?: { id?: string; nameFr: string; slugFr: string };
  brand?: { id?: string; name: string; slugFr: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProductDetail = ProductListItem & {
  categoryId: string;
  brandId?: string | null;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  weightKg?: string | number | null;
  volumeMl?: string | number | null;
  ingredients?: string | null;
  allergens?: string | null;
  storageConditions?: string | null;
  keywords?: string[];
  seoTitleFr?: string | null;
  seoDescriptionFr?: string | null;
  lots?: Array<{
    id: string;
    lotNumber: string;
    expiryDate: string;
    quantity: number;
  }>;
};

export type SearchProductItem = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  promoPrice?: number | null;
  effectivePrice?: number;
  currency: string;
  originCountry?: string | null;
  stockQty: number;
  inStock?: boolean;
  onPromo?: boolean;
  purchaseMode: 'DIRECT' | 'QUOTE' | 'HYBRID';
  packaging?: string | null;
  unitsPerCarton?: number | null;
  hybridThresholdQty?: number | null;
  ratingsAvg?: number;
  ratingsCount?: number;
  brand?: { id?: string; name: string; slugFr: string; slugEn?: string } | null;
  category?: {
    id?: string;
    nameFr: string;
    nameEn?: string;
    slugFr: string;
    slugEn?: string;
  } | null;
  image?: { url: string; altFr?: string | null; altEn?: string | null } | null;
  createdAt?: string;
};

export type SearchResponse = {
  items: SearchProductItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    sort?: string;
    q?: string | null;
  };
};

export type PublicReview = {
  id: string;
  productId: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  createdAt: string;
  authorName: string;
  photos?: Array<{ id: string; fileUrl: string }>;
};

export type OwnerReview = PublicReview & {
  isApproved: boolean;
  isVisible: boolean;
  product?: {
    id: string;
    sku: string;
    nameFr: string;
    nameEn: string;
    slugFr: string;
    slugEn: string;
  };
  message?: string;
};

export type AdminReview = {
  id: string;
  productId: string;
  userId: string;
  orderId?: string | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  isApproved: boolean;
  isVisible: boolean;
  createdAt: string;
  moderatedAt?: string | null;
  authorName: string;
  authorEmail: string;
  product: {
    id: string;
    sku: string;
    nameFr: string;
    nameEn: string;
    slugFr: string;
    slugEn: string;
  };
  photos?: Array<{ id: string; fileUrl: string }>;
};

export type ProductsResponse = {
  items: ProductListItem[];
  meta: { total: number; page: number; limit: number; pages: number };
};

export type Category = {
  id: string;
  slugFr: string;
  slugEn: string;
  nameFr: string;
  nameEn: string;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  children?: Category[];
};

export type Brand = {
  id: string;
  slugFr: string;
  slugEn: string;
  name: string;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

export type Address = {
  id: string;
  type: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

export type SafeUser = {
  id: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'DEVELOPER' | 'CUSTOMER_INDIVIDUAL' | 'CUSTOMER_PRO';
  status: string;
  locale: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  individualProfile?: { firstName: string; lastName: string } | null;
  professionalProfile?: {
    companyName: string;
    contactPerson: string;
    validationStatus: string;
    taxId?: string | null;
    ice?: string | null;
    sector?: string | null;
    tradeRegister?: string | null;
    billingAddress?: string | null;
    documentUrls?: string[];
    rejectionReason?: string | null;
    validatedAt?: string | null;
  } | null;
};

export type AdminClient = SafeUser & {
  _count?: { orders?: number; quotes?: number };
  lastOrderAt?: string | null;
  lastOrderNumber?: string | null;
};

export type AdminClientDetail = SafeUser & {
  spentTotal?: string | number;
  _count?: {
    orders?: number;
    quotes?: number;
    returns?: number;
    addresses?: number;
  };
  addresses?: Array<{
    id: string;
    type: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    region?: string | null;
    postalCode?: string | null;
    country: string;
    phone?: string | null;
    isDefault: boolean;
  }>;
  orders?: Array<{
    id: string;
    number: string;
    status: string;
    total: string | number;
    currency: string;
    paymentMethod?: string;
    createdAt: string;
  }>;
  quotes?: Array<{
    id: string;
    number: string;
    status: string;
    total?: string | number | null;
    currency?: string;
    destinationCountry?: string;
    createdAt: string;
  }>;
  returns?: Array<{
    id: string;
    number: string;
    status: string;
    reason: string;
    createdAt: string;
    order?: { id: string; number: string } | null;
  }>;
};

export const QUOTE_ROLES: SafeUser['role'][] = [
  'CUSTOMER_PRO',
  'ADMIN',
  'DEVELOPER',
];

const AUTH_CHANGED_EVENT = 'md-auth-changed';

function notifyAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeAuth(onChange: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(AUTH_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function isProAccount(user?: Pick<SafeUser, 'role'> | null) {
  return Boolean(user && QUOTE_ROLES.includes(user.role));
}

export type PaymentMethodInfo = {
  provider: 'CMI' | 'BANK_TRANSFER' | 'STRIPE' | 'COD';
  isEnabled: boolean;
  labelFr: string;
  labelEn: string;
  ready: boolean;
};

export type CheckoutOrderResponse = {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  deliveryMode: string;
  total: number;
  currency: string;
  shippingFee?: number;
  taxAmount?: number;
  subtotal?: number;
  discount?: number;
  nextStep?: string;
};

export type BankTransferInitResponse = {
  paymentId: string;
  provider: 'BANK_TRANSFER';
  status: string;
  bankDetails: {
    bankName: string;
    iban: string;
    rib: string;
    accountName: string;
    reference: string;
    amount: number;
    currency: string;
  };
  instructions: string;
};

export type CmiInitResponse = {
  paymentId: string;
  provider: 'CMI';
  status: string;
  gatewayUrl: string;
  formFields: Record<string, string>;
  note?: string;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  provider: 'CMI' | 'BANK_TRANSFER' | 'STRIPE' | 'COD';
  status:
    | 'PENDING'
    | 'AWAITING_PROOF'
    | 'PROOF_SUBMITTED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'
    | 'REFUNDED';
  amount: string | number;
  currency: string;
  providerRef?: string | null;
  proofUrl?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  paidAt?: string | null;
  confirmedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    number: string;
    status: string;
    userId: string;
    paymentMethod?: string;
    total?: number;
    currency?: string;
    user?: {
      email?: string | null;
      phone?: string | null;
      individualProfile?: { firstName: string; lastName: string } | null;
      professionalProfile?: {
        companyName: string;
        contactPerson: string;
      } | null;
    } | null;
  };
};

export type CartResponse = {
  id: string;
  currency?: string;
  promoCode?: {
    code: string;
    type: string;
    value: number;
  } | null;
  items: Array<{
    id: string;
    productId?: string;
    variantId?: string | null;
    quantity: number;
    unitPrice?: number;
    lineTotal?: number;
    product: ProductListItem & {
      purchaseMode?: 'DIRECT' | 'QUOTE' | 'HYBRID';
      hybridThresholdQty?: number | null;
      image?: {
        url: string;
        altFr?: string | null;
        isPrimary?: boolean;
      } | null;
    };
    variant?: {
      id: string;
      sku: string;
      nameFr: string;
      nameEn: string;
      stockQty: number;
    } | null;
  }>;
  totals?: {
    subtotal: number;
    discount: number;
    taxAmount: number;
    shippingFee: number;
    total: number;
    currency: string;
  };
};

export type OrderSummary = {
  id: string;
  number: string;
  status: string;
  paymentMethod?: string;
  deliveryMode?: string;
  subtotal?: string | number;
  discount?: string | number;
  taxAmount?: string | number;
  taxRate?: string | number;
  shippingFee?: string | number;
  total: string | number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  adminNote?: string | null;
  customerNote?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  promoCodeSnapshot?: string | null;
  allowedNextStatuses?: string[];
  shippingAddressSnap?: {
    label?: string | null;
    line1?: string;
    line2?: string | null;
    city?: string;
    country?: string;
    phone?: string | null;
    region?: string | null;
    postalCode?: string | null;
  } | null;
  billingAddressSnap?: {
    line1?: string;
    city?: string;
    country?: string;
    phone?: string | null;
  } | null;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    role?: string;
    individualProfile?: { firstName: string; lastName: string } | null;
    professionalProfile?: {
      companyName: string;
      contactPerson: string;
    } | null;
  } | null;
  quote?: { id: string; number: string; status: string } | null;
  items?: Array<{
    id: string;
    sku?: string;
    quantity: number;
    nameFr?: string;
    productNameFr?: string;
    unitPrice?: string | number;
    lineTotal?: string | number;
  }>;
  history?: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
  }>;
  documents?: Array<{
    id: string;
    type: string;
    fileUrl: string;
    locale?: string;
    createdAt: string;
  }>;
  shipments?: Array<{
    id: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    status: string;
    carrierName?: string | null;
    carrier?: { name: string } | null;
  }>;
  payments?: Array<{
    id: string;
    status: string;
    provider: string;
    amount: number;
    currency: string;
    proofUrl?: string | null;
    createdAt: string;
  }>;
};

export type QuoteSummary = {
  id: string;
  number?: string;
  status: string;
  destinationCountry: string;
  companyName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyAddress?: string | null;
  taxId?: string | null;
  ice?: string | null;
  desiredDeadline?: string | null;
  message?: string | null;
  createdAt: string;
  sentAt?: string | null;
  validityDate?: string | null;
  conditions?: string | null;
  adminNote?: string | null;
  clientModificationNote?: string | null;
  pdfUrl?: string | null;
  currency?: string;
  subtotal?: string | number | null;
  discount?: string | number | null;
  taxRate?: string | number | null;
  taxAmount?: string | number | null;
  shippingFee?: string | number | null;
  total?: string | number | null;
  user?: {
    id: string;
    email?: string | null;
    phone?: string | null;
    professionalProfile?: {
      companyName?: string | null;
      contactPerson?: string | null;
      ice?: string | null;
      taxId?: string | null;
    } | null;
  } | null;
  order?: { id: string; number: string; status: string } | null;
  history?: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
  }>;
  items?: Array<{
    id: string;
    quantity: number;
    packaging?: string | null;
    sku?: string;
    nameFr?: string;
    nameEn?: string;
    unitPrice?: number | null;
    lineTotal?: number | null;
    product?: {
      id?: string;
      nameFr: string;
      slugFr: string;
      packaging?: string | null;
      images?: Array<{ url: string }>;
    };
    variant?: { id: string; nameFr: string } | null;
  }>;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    fileName?: string | null;
  }>;
};

export type QuoteAttachmentUpload = {
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type FaqItem = {
  id: string;
  questionFr: string;
  answerFr: string;
  category?: string | null;
};

export type BlogPost = {
  id: string;
  slugFr: string;
  titleFr: string;
  excerptFr?: string | null;
  contentFr?: string;
  publishedAt?: string | null;
  coverUrl?: string | null;
};

export type LegalPage = {
  id: string;
  type: string;
  slugFr: string;
  titleFr: string;
  contentFr: string;
};

export type AdminDashboard = {
  generatedAt: string;
  kpis: {
    ordersToday: number;
    ordersMonth: number;
    revenueMonth: number;
    paidOrdersMonth: number;
    customersTotal: number;
    productsActive: number;
    lowStock: number;
  };
  queues: {
    customersProPending: number;
    pendingQuotes: number;
    pendingReturns: number;
    pendingReviews: number;
    awaitingPayments: number;
    openShipments: number;
  };
  ordersByStatus: Record<string, number>;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export function mediaUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base =
    process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('md_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('md_refresh_token');
}

export function hasSession(): boolean {
  return Boolean(getToken() || getRefreshToken());
}

export function setAuth(tokens: {
  accessToken: string;
  refreshToken?: string;
}) {
  localStorage.setItem('md_access_token', tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem('md_refresh_token', tokens.refreshToken);
  }
  notifyAuthChanged();
}

export function clearAuth() {
  localStorage.removeItem('md_access_token');
  localStorage.removeItem('md_refresh_token');
  notifyAuthChanged();
}

export type GoogleExchangeResult = {
  accessToken: string;
  refreshToken: string;
  next?: string;
  user?: { role: string };
};

const googleExchangeInflight = new Map<string, Promise<GoogleExchangeResult>>();

export function exchangeGoogleCode(code: string) {
  const key = code.trim();
  const existing = googleExchangeInflight.get(key);
  if (existing) return existing;
  const request = api<GoogleExchangeResult>('/auth/google/exchange', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ code: key }),
  });
  googleExchangeInflight.set(key, request);
  return request;
}

let refreshInFlight: Promise<boolean> | null = null;

function shouldAttemptRefresh(path: string) {
  return (
    path !== '/auth/refresh' &&
    path !== '/auth/login' &&
    !path.startsWith('/auth/register') &&
    path !== '/auth/google/exchange' &&
    path !== '/auth/providers'
  );
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
      if (!res.ok) {
        clearAuth();
        return false;
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken?: string;
      };
      if (!data.accessToken) {
        clearAuth();
        return false;
      }
      setAuth(data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    await api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  } catch {
    /* still clear local session */
  }
  clearAuth();
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  const { _retried, auth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth !== false) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    cache: 'no-store',
  });

  if (
    res.status === 401 &&
    !_retried &&
    auth !== false &&
    shouldAttemptRefresh(path)
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api<T>(path, { ...options, _retried: true });
    }
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      message = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function uploadPaymentProof(
  paymentId: string,
  file: File,
  note?: string,
): Promise<PaymentRecord> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  if (note?.trim()) form.append('note', note.trim());

  const response = await fetch(
    `${API_URL}/payments/${encodeURIComponent(paymentId)}/proof-file`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;
    throw new Error(message || `Erreur HTTP ${response.status}`);
  }

  return response.json() as Promise<PaymentRecord>;
}

export type ProductImageUpload = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function uploadProductImages(
  files: File[],
): Promise<ProductImageUpload[]> {
  const token = getToken();
  const form = new FormData();
  for (const file of files) {
    form.append('files', file);
  }

  const response = await fetch(`${API_URL}/admin/products/upload-images`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;
    throw new Error(message || `Erreur HTTP ${response.status}`);
  }

  const data = (await response.json()) as { files?: ProductImageUpload[] };
  return data.files ?? [];
}

export async function uploadQuoteAttachment(
  file: File,
): Promise<QuoteAttachmentUpload> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_URL}/quotes/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;
    throw new Error(message || `Erreur HTTP ${response.status}`);
  }

  return response.json() as Promise<QuoteAttachmentUpload>;
}

export function formatPrice(
  value: string | number | null | undefined,
  currency = 'MAD',
) {
  const n = Number(value ?? 0);
  return `${n.toFixed(2)} ${currency}`;
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'En attente de paiement',
    PAID: 'Payée',
    CONFIRMED: 'Confirmée',
    PREPARING: 'En préparation',
    READY_TO_SHIP: 'Prête à expédier',
    SHIPPED: 'Expédiée',
    OUT_FOR_DELIVERY: 'En livraison',
    DELIVERED: 'Livrée',
    CANCELLED: 'Annulée',
    RETURNED: 'Retournée',
    REFUNDED: 'Remboursée',
    REQUESTED: 'Demandé',
    IN_REVIEW: 'En revue',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Refusé',
    EXPIRED: 'Expiré',
    CONVERTED: 'Converti',
    MODIFICATION_REQUESTED: 'Modification demandée',
    UNDER_REVIEW: 'En revue',
    APPROVED: 'Approuvé',
    AWAITING_RETURN_SHIPMENT: 'Retour à expédier',
    RECEIVED: 'Reçu',
    CLOSED: 'Clôturé',
    ACTIVE: 'Actif',
    BLOCKED: 'Bloqué',
    PENDING: 'En attente',
    LABEL_CREATED: 'Étiquette créée',
    IN_TRANSIT: 'En transit',
    CUSTOMER_INDIVIDUAL: 'Particulier',
    CUSTOMER_PRO: 'Professionnel',
    ADMIN: 'Admin',
    DEVELOPER: 'Développeur',
    SHIPPING: 'Livraison',
    BILLING: 'Facturation',
    PENDING_VERIFICATION: 'Vérification',
    DEFECTIVE: 'Défectueux',
    WRONG_ITEM: 'Mauvais article',
    DAMAGED_IN_TRANSIT: 'Endommagé',
    NEAR_EXPIRY: 'Péremption proche',
    NOT_AS_DESCRIBED: 'Non conforme',
    OTHER: 'Autre',
    CMI: 'Carte bancaire',
    BANK_TRANSFER: 'Virement',
    STRIPE: 'Stripe',
    COD: 'Paiement à la livraison',
    DIRECT: 'Achat direct',
    QUOTE: 'Devis',
    HYBRID: 'Hybride',
    EXPRESS: 'Express',
    PICKUP: 'Retrait',
    INVOICE: 'Facture',
    DELIVERY_NOTE: 'Bon de livraison',
    PROFORMA: 'Proforma',
    RECEIPT: 'Reçu',
    CREDIT_NOTE: 'Avoir',
    PURCHASE_ORDER: 'Bon de commande',
    SUCCEEDED: 'Confirmé',
    FAILED: 'Échoué',
    PROCESSING: 'En traitement',
    AWAITING_PROOF: 'Justificatif attendu',
    PROOF_SUBMITTED: 'À vérifier',
  };
  return map[status] ?? status;
}

export async function apiDownload(path: string, filename: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Export impossible (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function asList<T>(data: T[] | { items?: T[] } | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}
