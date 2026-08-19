'use client';

import Link from 'next/link';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  ChevronDown,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { ProQuotesNotice } from '@/components/ProQuotesNotice';
import { useToast } from '@/components/shop/ToastProvider';
import {
  api,
  mediaUrl,
  QUOTE_ROLES,
  uploadQuoteAttachment,
  type Address,
  type CartResponse,
  type QuoteAttachmentUpload,
  type QuoteSummary,
  type SafeUser,
  type SearchProductItem,
  type SearchResponse,
} from '@/lib/api';
import type { ProductDetail } from '@/components/product/product-types';
import '@/app/commande/commande.css';
import './devis.css';

type RequestType = 'MA' | 'EXPORT';
type PurchaseMode = 'DIRECT' | 'QUOTE' | 'HYBRID';
type Frequency =
  | 'PONCTUELLE'
  | 'MENSUELLE'
  | 'HEBDOMADAIRE'
  | 'REGULIER'
  | '';
type TransportMode = 'A_DETERMINER' | 'MARITIME' | 'AERIEN' | 'ROUTIER';
type FieldErrors = Record<string, string>;

type QuoteLine = {
  key: string;
  productId: string;
  variantId?: string;
  quantity: number;
  packaging: string;
  unitMode: 'unit' | 'carton';
  name: string;
  brand?: string | null;
  slug: string;
  imageUrl?: string | null;
  purchaseMode: PurchaseMode;
  unitsPerCarton?: number | null;
  hybridThresholdQty?: number | null;
  productPackaging?: string | null;
};

type CustomNeed = {
  key: string;
  name: string;
  quantity: string;
  packaging: string;
  comment: string;
};

type PendingFile = QuoteAttachmentUpload & { localName: string };

const FREQ_LABELS: Record<Exclude<Frequency, ''>, string> = {
  PONCTUELLE: 'Commande ponctuelle',
  MENSUELLE: 'Mensuelle',
  HEBDOMADAIRE: 'Hebdomadaire',
  REGULIER: 'Besoin régulier',
};

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  A_DETERMINER: 'À déterminer',
  MARITIME: 'Maritime',
  AERIEN: 'Aérien',
  ROUTIER: 'Routier',
};

function normalizePurchaseMode(mode?: string | null): PurchaseMode {
  return mode === 'QUOTE' || mode === 'HYBRID' ? mode : 'DIRECT';
}

function packagingOptions(packaging?: string | null, unitsPerCarton?: number | null) {
  const options: Array<{ value: string; label: string }> = [];
  const base = packaging?.trim();
  if (base) options.push({ value: base, label: base });
  options.push({ value: 'Unité', label: 'Unité' });
  if (unitsPerCarton && unitsPerCarton > 1) {
    options.push({
      value: `Carton (${unitsPerCarton} unités)`,
      label: `Carton (${unitsPerCarton} unités)`,
    });
  }
  const seen = new Set<string>();
  return options.filter((o) => {
    if (seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

function lineFromProduct(
  product: {
    id: string;
    name: string;
    slug: string;
    brand?: string | null;
    imageUrl?: string | null;
    purchaseMode: PurchaseMode;
    packaging?: string | null;
    unitsPerCarton?: number | null;
    hybridThresholdQty?: number | null;
  },
  opts?: { variantId?: string; quantity?: number; packaging?: string },
): QuoteLine {
  const options = packagingOptions(product.packaging, product.unitsPerCarton);
  return {
    key: `${product.id}:${opts?.variantId ?? 'base'}:${Date.now()}`,
    productId: product.id,
    variantId: opts?.variantId,
    quantity: Math.max(1, opts?.quantity ?? 50),
    packaging: opts?.packaging ?? options[0]?.value ?? 'Unité',
    unitMode: 'unit',
    name: product.name,
    brand: product.brand,
    slug: product.slug,
    imageUrl: product.imageUrl,
    purchaseMode: product.purchaseMode,
    unitsPerCarton: product.unitsPerCarton,
    hybridThresholdQty: product.hybridThresholdQty,
    productPackaging: product.packaging,
  };
}

function formatDateLabel(value: string) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function buildStructuredMessage(parts: {
  frequency: Frequency;
  transport: TransportMode;
  requestType: RequestType;
  city: string;
  address: string;
  postalCode: string;
  customNeeds: CustomNeed[];
  freeMessage: string;
}) {
  const blocks: string[] = [];

  if (parts.frequency) {
    blocks.push(`Fréquence: ${FREQ_LABELS[parts.frequency]}`);
  }

  blocks.push(
    `Type de demande: ${
      parts.requestType === 'MA'
        ? 'Commande professionnelle Maroc'
        : 'Export / International'
    }`,
  );

  if (parts.requestType === 'EXPORT') {
    blocks.push(`Transport souhaité: ${TRANSPORT_LABELS[parts.transport]}`);
  }

  const location = [parts.address, parts.postalCode, parts.city]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
  if (location) {
    blocks.push(`Lieu / zone: ${location}`);
  }

  if (parts.customNeeds.length) {
    blocks.push('Besoins spécifiques hors catalogue:');
    for (const need of parts.customNeeds) {
      const bits = [
        need.name.trim(),
        need.quantity.trim() ? `qté ${need.quantity.trim()}` : '',
        need.packaging.trim() ? `cond. ${need.packaging.trim()}` : '',
        need.comment.trim(),
      ].filter(Boolean);
      blocks.push(`- ${bits.join(' · ')}`);
    }
  }

  if (parts.freeMessage.trim()) {
    blocks.push('Informations complémentaires:');
    blocks.push(parts.freeMessage.trim());
  }

  return blocks.join('\n');
}

function DevisInner({ user }: { user: SafeUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const ctaRef = useRef<HTMLButtonElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededRef = useRef(false);
  const linesRef = useRef<QuoteLine[]>([]);

  const prefProductId = searchParams.get('productId')?.trim() ?? '';
  const prefSlug = searchParams.get('slug')?.trim() ?? '';
  const prefVariantId = searchParams.get('variantId')?.trim() ?? '';
  const prefQty = Number(searchParams.get('qty') ?? '') || undefined;
  const fromCart = searchParams.get('fromCart') === 'true';

  const [requestType, setRequestType] = useState<RequestType>('MA');
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [customNeeds, setCustomNeeds] = useState<CustomNeed[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    name: '',
    quantity: '',
    packaging: '',
    comment: '',
  });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('');
  const [desiredDeadline, setDesiredDeadline] = useState('');
  const [transport, setTransport] = useState<TransportMode>('A_DETERMINER');
  const [destinationCountry, setDestinationCountry] = useState('MA');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<PendingFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerItems, setPickerItems] = useState<SearchProductItem[]>([]);
  const [importingCart, setImportingCart] = useState(false);

  const [companyName, setCompanyName] = useState(
    user.professionalProfile?.companyName ?? '',
  );
  const [contactName, setContactName] = useState(
    user.professionalProfile?.contactPerson ??
      (user.individualProfile
        ? `${user.individualProfile.firstName} ${user.individualProfile.lastName}`
        : ''),
  );
  const [contactEmail, setContactEmail] = useState(user.email ?? '');
  const [contactPhone, setContactPhone] = useState(user.phone ?? '');
  const [ice, setIce] = useState(user.professionalProfile?.ice ?? '');
  const [taxId, setTaxId] = useState(user.professionalProfile?.taxId ?? '');
  const [companyAddress, setCompanyAddress] = useState('');

  const activeStep = useMemo(() => {
    const hasProducts = lines.length > 0 || customNeeds.length > 0;
    const hasDest =
      (requestType === 'EXPORT' && destinationCountry.trim().length >= 2) ||
      (requestType === 'MA' && Boolean(city || addressLine || selectedAddressId));
    const hasCompany = Boolean(
      companyName.trim() || contactEmail.trim() || contactPhone.trim(),
    );
    if (hasProducts && hasDest) return 2;
    if (hasProducts && hasCompany) return 1;
    if (hasProducts) return 0;
    return 0;
  }, [
    lines.length,
    customNeeds.length,
    requestType,
    destinationCountry,
    city,
    addressLine,
    selectedAddressId,
    companyName,
    contactEmail,
    contactPhone,
  ]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const addProductLine = useCallback((line: QuoteLine) => {
    setLines((prev) => {
      const existing = prev.find(
        (item) =>
          item.productId === line.productId &&
          (item.variantId ?? '') === (line.variantId ?? ''),
      );
      if (existing) {
        toast.push('Produit déjà dans la demande');
        return prev;
      }
      return [...prev, line];
    });
  }, [toast]);

  const seedFromDetail = useCallback(
    (product: ProductDetail, variantId?: string, quantity?: number) => {
      const variant = product.variants?.find((v) => v.id === variantId);
      const image =
        variant?.imageUrl ??
        product.images?.find((i) => i.isPrimary)?.url ??
        product.images?.[0]?.url ??
        null;
      addProductLine(
        lineFromProduct(
          {
            id: product.id,
            name: variant
              ? `${product.nameFr} — ${variant.nameFr}`
              : product.nameFr,
            slug: product.slugFr,
            brand: product.brand?.name ?? null,
            imageUrl: image,
            purchaseMode: normalizePurchaseMode(product.purchaseMode),
            packaging: product.packaging,
            unitsPerCarton: product.unitsPerCarton,
            hybridThresholdQty: product.hybridThresholdQty,
          },
          { variantId: variant?.id, quantity },
        ),
      );
    },
    [addProductLine],
  );

  useEffect(() => {
    api<Address[]>('/users/me/addresses')
      .then((list) => {
        setAddresses(list);
        const preferred =
          list.find((a) => a.isDefault && (a.type === 'SHIPPING' || !a.type)) ??
          list.find((a) => a.type === 'SHIPPING' || !a.type) ??
          list[0];
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setCity(preferred.city ?? '');
          setAddressLine(
            [preferred.line1, preferred.line2].filter(Boolean).join(', '),
          );
          setPostalCode(preferred.postalCode ?? '');
          if (preferred.country && preferred.country !== 'MA') {
            setRequestType('EXPORT');
            setDestinationCountry(preferred.country);
          }
          setCompanyAddress(
            [
              preferred.line1,
              preferred.line2,
              preferred.postalCode,
              preferred.city,
              preferred.country,
            ]
              .filter(Boolean)
              .join(', '),
          );
        }
      })
      .catch(() => setAddresses([]));
  }, []);

  const importCart = useCallback(async () => {
    setImportingCart(true);
    try {
      const cart = await api<CartResponse>('/cart');
      const candidates: QuoteLine[] = [];
      for (const item of cart.items ?? []) {
        candidates.push(
          lineFromProduct(
            {
              id: item.product.id,
              name: item.variant
                ? `${item.product.nameFr} — ${item.variant.nameFr}`
                : item.product.nameFr,
              slug: item.product.slugFr,
              brand: item.product.brand?.name ?? null,
              imageUrl:
                item.product.images?.[0]?.url ??
                item.product.image?.url ??
                null,
              purchaseMode: normalizePurchaseMode(item.product.purchaseMode),
              packaging: item.product.packaging,
              unitsPerCarton: item.product.unitsPerCarton,
              hybridThresholdQty: item.product.hybridThresholdQty,
            },
            {
              variantId: item.variant?.id,
              quantity: item.quantity,
            },
          ),
        );
      }

      if (!candidates.length) {
        toast.push('Votre panier est vide.', 'error');
        return;
      }

      const merged = [...linesRef.current];
      let added = 0;
      for (const candidate of candidates) {
        const exists = merged.some(
          (line) =>
            line.productId === candidate.productId &&
            (line.variantId ?? '') === (candidate.variantId ?? ''),
        );
        if (exists) continue;
        merged.push(candidate);
        added += 1;
      }

      if (!added) {
        toast.push('Ces produits sont déjà dans votre demande.');
        return;
      }

      setLines(merged);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.products;
        return next;
      });
      toast.push(
        `${added} produit${added > 1 ? 's' : ''} importé${added > 1 ? 's' : ''} depuis le panier`,
      );
    } catch (err) {
      toast.push(
        err instanceof Error ? err.message : 'Import du panier impossible',
        'error',
      );
    } finally {
      setImportingCart(false);
    }
  }, [toast]);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    async function seed() {
      try {
        if (fromCart) {
          await importCart();
          return;
        }

        if (prefSlug) {
          const product = await api<ProductDetail>(
            `/products/${encodeURIComponent(prefSlug)}`,
            { auth: false },
          );
          seedFromDetail(product, prefVariantId || undefined, prefQty);
          return;
        }

        if (prefProductId) {
          const list = await api<{
            items: Array<{
              id: string;
              slugFr: string;
              nameFr: string;
              purchaseMode?: string;
              packaging?: string | null;
              unitsPerCarton?: number | null;
              hybridThresholdQty?: number | null;
              brand?: { name: string } | null;
              images?: Array<{ url: string; isPrimary?: boolean }>;
            }>;
          }>('/products?limit=100', { auth: false }).catch(() => null);
          const match = list?.items?.find((p) => p.id === prefProductId);
          if (match) {
            addProductLine(
              lineFromProduct(
                {
                  id: match.id,
                  name: match.nameFr,
                  slug: match.slugFr,
                  brand: match.brand?.name ?? null,
                  imageUrl:
                    match.images?.find((i) => i.isPrimary)?.url ??
                    match.images?.[0]?.url ??
                    null,
                  purchaseMode: normalizePurchaseMode(match.purchaseMode),
                  packaging: match.packaging,
                  unitsPerCarton: match.unitsPerCarton,
                  hybridThresholdQty: match.hybridThresholdQty,
                },
                {
                  variantId: prefVariantId || undefined,
                  quantity: prefQty,
                },
              ),
            );
          }
        }
      } catch {
        /* ignore seed errors */
      }
    }

    void seed();
  }, [
    fromCart,
    prefSlug,
    prefProductId,
    prefVariantId,
    prefQty,
    seedFromDetail,
    addProductLine,
    importCart,
    toast,
  ]);

  useEffect(() => {
    if (requestType === 'MA') {
      setDestinationCountry('MA');
    } else if (destinationCountry === 'MA') {
      setDestinationCountry('');
    }
  }, [requestType]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lines.length]);

  const runSearch = useCallback(async (q: string) => {
    setPickerLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '40',
        page: '1',
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api<SearchResponse>(`/search?${params}`, {
        auth: false,
      });
      setPickerItems(data.items ?? []);
    } catch {
      setPickerItems([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void runSearch(pickerQuery);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [pickerQuery, pickerOpen, runSearch]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  function applyAddress(address: Address) {
    setSelectedAddressId(address.id);
    setCity(address.city ?? '');
    setAddressLine([address.line1, address.line2].filter(Boolean).join(', '));
    setPostalCode(address.postalCode ?? '');
    if (address.country) {
      if (address.country === 'MA') {
        setRequestType('MA');
        setDestinationCountry('MA');
      } else {
        setRequestType('EXPORT');
        setDestinationCountry(address.country);
      }
    }
  }

  function updateLine(key: string, patch: Partial<QuoteLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  function addCustomNeed() {
    if (!customDraft.name.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        customName: 'Indiquez le produit recherché',
      }));
      return;
    }
    setCustomNeeds((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        name: customDraft.name.trim(),
        quantity: customDraft.quantity.trim(),
        packaging: customDraft.packaging.trim(),
        comment: customDraft.comment.trim(),
      },
    ]);
    setCustomDraft({ name: '', quantity: '', packaging: '', comment: '' });
    setShowCustomForm(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.customName;
      return next;
    });
  }

  async function onFileChange(files: FileList | null) {
    if (!files?.length) return;
    setUploadingFile(true);
    try {
      const uploaded: PendingFile[] = [];
      for (const file of Array.from(files).slice(0, 5)) {
        const result = await uploadQuoteAttachment(file);
        uploaded.push({ ...result, localName: file.name });
      }
      setAttachments((prev) => [...prev, ...uploaded].slice(0, 8));
      toast.push(
        uploaded.length > 1
          ? `${uploaded.length} fichiers ajoutés`
          : 'Fichier ajouté',
      );
    } catch (err) {
      toast.push(
        err instanceof Error ? err.message : 'Upload impossible',
        'error',
      );
    } finally {
      setUploadingFile(false);
    }
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!companyName.trim() && !contactName.trim()) {
      errors.companyName = 'Raison sociale ou nom du contact requis';
    }
    if (!contactEmail.trim() && !contactPhone.trim()) {
      errors.contactEmail = 'Email ou téléphone requis';
      errors.contactPhone = 'Email ou téléphone requis';
    } else if (
      contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
    ) {
      errors.contactEmail = 'Email invalide';
    }
    if (lines.length === 0 && customNeeds.length === 0) {
      errors.products = 'Ajoutez au moins un produit ou un besoin spécifique';
    }
    for (const line of lines) {
      if (!line.quantity || line.quantity < 1) {
        errors[`qty-${line.key}`] = 'Quantité invalide';
      }
    }
    if (requestType === 'EXPORT' && destinationCountry.trim().length < 2) {
      errors.destinationCountry = 'Pays de destination requis';
    }
    return errors;
  }

  function scrollToFirstError(errors: FieldErrors) {
    const order = [
      'companyName',
      'contactName',
      'contactEmail',
      'contactPhone',
      'products',
      'destinationCountry',
      'customName',
    ];
    const first =
      order.find((key) => errors[key]) ??
      Object.keys(errors).find((key) => errors[key]);
    if (!first) return;
    const el = document.querySelector(`[data-field="${first}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function placeRequest(e?: FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length) {
      scrollToFirstError(errors);
      return;
    }

    setSubmitting(true);
    try {
      const structured = buildStructuredMessage({
        frequency,
        transport,
        requestType,
        city,
        address: addressLine,
        postalCode,
        customNeeds,
        freeMessage: message,
      });

      const payloadItems =
        lines.length > 0
          ? lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              packaging: line.packaging || undefined,
            }))
          : undefined;

      if (!payloadItems?.length) {
        // Backend requires ≥1 catalog item — block if only custom needs
        // unless we have at least one line. Surface clear error.
        setFormError(
          'Ajoutez au moins un produit catalogue. Les besoins spécifiques complètent la demande.',
        );
        setFieldErrors({ products: 'Ajoutez un produit catalogue' });
        scrollToFirstError({ products: 'x' });
        return;
      }

      const quote = await api<QuoteSummary>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          items: payloadItems,
          destinationCountry:
            requestType === 'MA' ? 'MA' : destinationCountry.trim(),
          companyName: companyName.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          companyAddress:
            companyAddress.trim() ||
            [addressLine, postalCode, city]
              .map((s) => s.trim())
              .filter(Boolean)
              .join(', ') ||
            undefined,
          taxId: taxId.trim() || undefined,
          ice: ice.trim() || undefined,
          desiredDeadline: desiredDeadline
            ? new Date(`${desiredDeadline}T12:00:00`).toISOString()
            : undefined,
          message: structured || undefined,
          attachments: attachments.length
            ? attachments.map(({ fileUrl, fileName, mimeType, sizeBytes }) => ({
                fileUrl,
                fileName,
                mimeType,
                sizeBytes,
              }))
            : undefined,
        }),
      });

      toast.push('Demande de devis envoyée');
      router.push(`/devis/succes?id=${encodeURIComponent(quote.id)}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Envoi impossible',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const summaryProducts = lines.slice(0, 3);
  const remaining = Math.max(0, lines.length - summaryProducts.length);
  const destinationLabel =
    requestType === 'MA'
      ? city || 'Maroc'
      : destinationCountry.trim() || 'International';

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Demander un devis</span>
        </nav>

        <header className="checkout-head">
          <h1>Demander un devis professionnel</h1>
          <p>
            Quantités importantes, besoins spécifiques ou export : décrivez
            votre demande et notre équipe vous accompagne avec une proposition
            adaptée.
          </p>
          <div className="checkout-stepper" role="list" aria-label="Progression">
            {[
              { label: 'Produits' },
              { label: 'Entreprise' },
              { label: requestType === 'EXPORT' ? 'Export' : 'Livraison' },
              { label: 'Vérification' },
            ].map((step, i, arr) => {
              const state =
                activeStep === i
                  ? 'active'
                  : activeStep > i
                    ? 'done'
                    : 'todo';
              return (
                <div
                  key={step.label}
                  role="listitem"
                  className={`checkout-stepper__step is-${state}`}
                >
                  {i < arr.length - 1 ? (
                    <span className="checkout-stepper__connector" aria-hidden />
                  ) : null}
                  <span className="checkout-stepper__circle" aria-hidden>
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  <span className="checkout-stepper__label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </header>

        <form
          className="checkout-flow"
          onSubmit={(e) => void placeRequest(e)}
          noValidate
        >
          <div className="checkout-cart-row">
            <div className="checkout-product-cards" data-field="products">
              <div className="devis-toolbar">
                <button
                  type="button"
                  className="checkout-cta devis-toolbar__cta"
                  onClick={() => {
                    setPickerOpen(true);
                    void runSearch('');
                  }}
                >
                  <Plus size={16} aria-hidden />
                  Ajouter des produits
                </button>
                <button
                  type="button"
                  className="checkout-add-addr"
                  disabled={importingCart}
                  onClick={() => void importCart()}
                >
                  <ShoppingCart size={14} aria-hidden />
                  {importingCart ? 'Import…' : 'Importer mon panier'}
                </button>
              </div>

              {fieldErrors.products ? (
                <p className="checkout-field__error">{fieldErrors.products}</p>
              ) : null}

              {lines.length === 0 ? (
                <div className="devis-empty-products">
                  <strong>Aucun produit sélectionné</strong>
                  <p>
                    Sélectionnez des références du catalogue ou importez les
                    articles de votre panier.
                  </p>
                </div>
              ) : (
                <>
                  <p className="devis-lines__count">
                    {lines.length} produit{lines.length > 1 ? 's' : ''}{' '}
                    sélectionné{lines.length > 1 ? 's' : ''}
                  </p>
                  {lines.map((line) => {
                    const options = packagingOptions(
                      line.productPackaging,
                      line.unitsPerCarton,
                    );
                    return (
                      <article key={line.key} className="checkout-product-card devis-product-card">
                        <div className="checkout-product-card__media">
                          {mediaUrl(line.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl(line.imageUrl) ?? undefined}
                              alt=""
                            />
                          ) : (
                            <span>DISC</span>
                          )}
                        </div>
                        <div className="checkout-product-card__body">
                          {line.brand ? (
                            <span className="checkout-product-card__cat">
                              {line.brand}
                            </span>
                          ) : null}
                          <strong>{line.name}</strong>
                          <span className="checkout-product-card__qty">
                            Qté ×{line.quantity}
                            {line.packaging ? ` · ${line.packaging}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="devis-line__remove"
                          aria-label={`Retirer ${line.name}`}
                          onClick={() => removeLine(line.key)}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                        <div className="devis-product-card__controls">
                          <div
                            className="checkout-field"
                            data-field={`qty-${line.key}`}
                          >
                            <label htmlFor={`qty-${line.key}`}>Quantité</label>
                            <input
                              id={`qty-${line.key}`}
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Math.max(
                                    1,
                                    Number(e.target.value) || 1,
                                  ),
                                })
                              }
                              className={
                                fieldErrors[`qty-${line.key}`]
                                  ? 'is-invalid'
                                  : undefined
                              }
                            />
                          </div>
                          <div className="checkout-field">
                            <label htmlFor={`pack-${line.key}`}>
                              Conditionnement
                            </label>
                            <select
                              id={`pack-${line.key}`}
                              value={line.packaging}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  packaging: e.target.value,
                                })
                              }
                            >
                              {options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {line.purchaseMode === 'HYBRID' &&
                        line.hybridThresholdQty ? (
                          <p className="checkout-hint devis-product-card__hint">
                            Au-delà de {line.hybridThresholdQty} unités, ce
                            produit passe en demande de devis.
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </>
              )}

              <div className="devis-custom">
                <p className="devis-custom__intro">
                  Vous recherchez autre chose ?
                </p>
                <button
                  type="button"
                  className="checkout-add-addr"
                  aria-expanded={showCustomForm}
                  onClick={() => setShowCustomForm((v) => !v)}
                >
                  {showCustomForm ? (
                    'Fermer le besoin spécifique'
                  ) : (
                    <>
                      Ajouter un besoin spécifique
                      <ArrowUpRight size={15} aria-hidden />
                    </>
                  )}
                </button>

                {showCustomForm ? (
                  <div className="devis-custom__form">
                    <div className="checkout-fields checkout-fields--2">
                      <div className="checkout-field" data-field="customName">
                        <label htmlFor="dv-custom-name">
                          Nom / type de produit
                        </label>
                        <input
                          id="dv-custom-name"
                          value={customDraft.name}
                          onChange={(e) =>
                            setCustomDraft((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                          className={
                            fieldErrors.customName ? 'is-invalid' : ''
                          }
                        />
                        {fieldErrors.customName ? (
                          <p className="checkout-field__error">
                            {fieldErrors.customName}
                          </p>
                        ) : null}
                      </div>
                      <div className="checkout-field">
                        <label htmlFor="dv-custom-qty">
                          Quantité estimée
                        </label>
                        <input
                          id="dv-custom-qty"
                          value={customDraft.quantity}
                          onChange={(e) =>
                            setCustomDraft((p) => ({
                              ...p,
                              quantity: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="checkout-field">
                        <label htmlFor="dv-custom-pack">
                          Conditionnement souhaité
                        </label>
                        <input
                          id="dv-custom-pack"
                          value={customDraft.packaging}
                          onChange={(e) =>
                            setCustomDraft((p) => ({
                              ...p,
                              packaging: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="checkout-field">
                        <label htmlFor="dv-custom-note">Commentaire</label>
                        <input
                          id="dv-custom-note"
                          value={customDraft.comment}
                          onChange={(e) =>
                            setCustomDraft((p) => ({
                              ...p,
                              comment: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="checkout-cta devis-toolbar__cta"
                      onClick={addCustomNeed}
                    >
                      Ajouter ce besoin
                    </button>
                  </div>
                ) : null}

                {customNeeds.length > 0 ? (
                  <div className="devis-custom-list">
                    {customNeeds.map((need) => (
                      <div key={need.key} className="devis-custom-item">
                        <div>
                          <strong>{need.name}</strong>
                          <div style={{ color: '#6e7f96', marginTop: 2 }}>
                            {[need.quantity, need.packaging, need.comment]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Retirer"
                          onClick={() =>
                            setCustomNeeds((prev) =>
                              prev.filter((n) => n.key !== need.key),
                            )
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

            </div>

            <aside
              className={`checkout-summary checkout-summary--totals${summaryOpen ? ' is-open' : ''}`}
              aria-labelledby="dv-summary-title"
            >
              <button
                type="button"
                className="checkout-summary__head"
                aria-expanded={summaryOpen}
                onClick={() => setSummaryOpen((v) => !v)}
              >
                <strong id="dv-summary-title">Résumé de la demande</strong>
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={summaryOpen ? 'is-open' : undefined}
                />
              </button>
              <div className="checkout-summary__body">
                <div className="checkout-totals">
                  <div>
                    <span>Type</span>
                    <span>
                      {requestType === 'MA'
                        ? 'Maroc'
                        : 'Export international'}
                    </span>
                  </div>
                  <div>
                    <span>Entreprise</span>
                    <span>{companyName || contactName || '—'}</span>
                  </div>
                  <div>
                    <span>Destination</span>
                    <span>{destinationLabel}</span>
                  </div>
                  <div>
                    <span>Produits</span>
                    <span>
                      {lines.length} référence{lines.length > 1 ? 's' : ''}
                      {customNeeds.length
                        ? ` · ${customNeeds.length} besoin${customNeeds.length > 1 ? 's' : ''}`
                        : ''}
                    </span>
                  </div>
                  {frequency ? (
                    <div>
                      <span>Fréquence</span>
                      <span>{FREQ_LABELS[frequency]}</span>
                    </div>
                  ) : null}
                  {desiredDeadline ? (
                    <div>
                      <span>Date souhaitée</span>
                      <span>{formatDateLabel(desiredDeadline)}</span>
                    </div>
                  ) : null}
                </div>
                {summaryProducts.length > 0 ? (
                  <div className="checkout-items">
                    {summaryProducts.map((line) => (
                      <div key={line.key} className="checkout-item">
                        <div className="checkout-item__info">
                          <strong>{line.name}</strong>
                          <span>
                            {line.quantity}{' '}
                            {line.packaging.toLowerCase().includes('carton')
                              ? 'cartons'
                              : 'u.'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {remaining > 0 ? (
                      <p className="checkout-items-more" style={{ cursor: 'default' }}>
                        + {remaining} autre{remaining > 1 ? 's' : ''} référence
                        {remaining > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>

          <div className="checkout-main">
            <section className="checkout-section" aria-labelledby="dv-company">
              <h2 className="checkout-section__title" id="dv-company">
                <span className="checkout-section__index">01 /</span>
                Entreprise & contact
              </h2>
              <p className="checkout-section__desc">
                Informations utilisées pour préparer votre proposition
                commerciale.
              </p>
              <div className="checkout-fields checkout-fields--2">
                <div className="checkout-field" data-field="companyName">
                  <label htmlFor="dv-company-name">Raison sociale</label>
                  <input
                    id="dv-company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={fieldErrors.companyName ? 'is-invalid' : undefined}
                  />
                  {fieldErrors.companyName ? (
                    <p className="checkout-field__error">
                      {fieldErrors.companyName}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field" data-field="contactName">
                  <label htmlFor="dv-contact-name">Nom du contact</label>
                  <input
                    id="dv-contact-name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div className="checkout-field" data-field="contactEmail">
                  <label htmlFor="dv-email">Email professionnel</label>
                  <input
                    id="dv-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={
                      fieldErrors.contactEmail ? 'is-invalid' : undefined
                    }
                  />
                  {fieldErrors.contactEmail ? (
                    <p className="checkout-field__error">
                      {fieldErrors.contactEmail}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field" data-field="contactPhone">
                  <label htmlFor="dv-phone">Téléphone</label>
                  <input
                    id="dv-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className={
                      fieldErrors.contactPhone ? 'is-invalid' : undefined
                    }
                  />
                  {fieldErrors.contactPhone ? (
                    <p className="checkout-field__error">
                      {fieldErrors.contactPhone}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field">
                  <label htmlFor="dv-ice">ICE</label>
                  <input
                    id="dv-ice"
                    value={ice}
                    onChange={(e) => setIce(e.target.value)}
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="dv-tax">Identifiant fiscal</label>
                  <input
                    id="dv-tax"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>
              </div>
              <div className="checkout-field" style={{ marginTop: '0.9rem' }}>
                <label htmlFor="dv-company-addr">Adresse entreprise</label>
                <input
                  id="dv-company-addr"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Adresse, ville, pays…"
                />
              </div>
            </section>

            <div className="checkout-block-grid">
              <section
                className="checkout-block-card checkout-block-card--delivery"
                aria-labelledby="dv-type"
              >
                <div className="checkout-block-card__head">
                  <strong id="dv-type">Type de demande</strong>
                </div>
                <div className="checkout-minis" role="radiogroup" aria-label="Type de demande">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={requestType === 'MA'}
                    className={`checkout-mini${requestType === 'MA' ? ' is-active' : ''}`}
                    onClick={() => setRequestType('MA')}
                  >
                    <span>
                      <strong>Maroc</strong>
                      <p>Volumes importants, livraison nationale.</p>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={requestType === 'EXPORT'}
                    className={`checkout-mini${requestType === 'EXPORT' ? ' is-active' : ''}`}
                    onClick={() => setRequestType('EXPORT')}
                  >
                    <span>
                      <strong>Export / International</strong>
                      <p>Approvisionnement hors Maroc.</p>
                    </span>
                  </button>
                </div>
              </section>

              <section
                className="checkout-block-card checkout-block-card--pay"
                aria-labelledby="dv-freq"
              >
                <div className="checkout-block-card__head">
                  <strong id="dv-freq">Fréquence</strong>
                </div>
                <div className="checkout-minis" role="radiogroup" aria-label="Fréquence">
                  {(
                    Object.keys(FREQ_LABELS) as Array<Exclude<Frequency, ''>>
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={frequency === key}
                      className={`checkout-mini${frequency === key ? ' is-active' : ''}`}
                      onClick={() => setFrequency(key)}
                    >
                      <span>
                        <strong>{FREQ_LABELS[key]}</strong>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="checkout-field" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="dv-deadline">Échéance souhaitée</label>
                  <input
                    id="dv-deadline"
                    type="date"
                    value={desiredDeadline}
                    onChange={(e) => setDesiredDeadline(e.target.value)}
                  />
                  <p className="checkout-hint">
                    Cette date nous aide à évaluer votre demande.
                  </p>
                </div>
              </section>

              <section
                className="checkout-block-card checkout-block-card--ship"
                aria-labelledby="dv-ship"
              >
                <div className="checkout-block-card__head">
                  <strong id="dv-ship">
                    {requestType === 'EXPORT'
                      ? 'Destination export'
                      : 'Livraison'}
                  </strong>
                </div>
                {addresses.length > 0 ? (
                  <div
                    className="checkout-minis"
                    role="radiogroup"
                    aria-label="Adresses enregistrées"
                  >
                    {addresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        role="radio"
                        aria-checked={selectedAddressId === address.id}
                        className={`checkout-mini${
                          selectedAddressId === address.id ? ' is-active' : ''
                        }`}
                        onClick={() => applyAddress(address)}
                      >
                        <span>
                          <strong>
                            {address.label || address.city || 'Adresse'}
                          </strong>
                          <p className="checkout-mini__address">
                            {address.line1}, {address.city}
                            {address.country ? ` · ${address.country}` : ''}
                          </p>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="checkout-fields checkout-fields--2" style={{ marginTop: addresses.length ? '0.75rem' : 0 }}>
                  {requestType === 'EXPORT' ? (
                    <div
                      className="checkout-field"
                      data-field="destinationCountry"
                    >
                      <label htmlFor="dv-country">Pays de destination</label>
                      <input
                        id="dv-country"
                        value={destinationCountry}
                        onChange={(e) => setDestinationCountry(e.target.value)}
                        className={
                          fieldErrors.destinationCountry ? 'is-invalid' : undefined
                        }
                        placeholder="France, Espagne…"
                      />
                      {fieldErrors.destinationCountry ? (
                        <p className="checkout-field__error">
                          {fieldErrors.destinationCountry}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="checkout-field">
                    <label htmlFor="dv-city">Ville</label>
                    <input
                      id="dv-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="dv-addr">Adresse / zone</label>
                    <input
                      id="dv-addr"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="dv-zip">Code postal</label>
                    <input
                      id="dv-zip"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>
                {requestType === 'MA' ? (
                  <p className="checkout-hint">
                    Les conditions de livraison seront intégrées à la proposition
                    commerciale.
                  </p>
                ) : (
                  <>
                    <p className="checkout-hint" style={{ marginBottom: '0.35rem' }}>
                      Mode de transport souhaité
                    </p>
                    <div
                      className="checkout-minis"
                      role="radiogroup"
                      aria-label="Transport"
                    >
                      {(Object.keys(TRANSPORT_LABELS) as TransportMode[]).map(
                        (key) => (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={transport === key}
                            className={`checkout-mini${
                              transport === key ? ' is-active' : ''
                            }`}
                            onClick={() => setTransport(key)}
                          >
                            <span>
                              <strong>{TRANSPORT_LABELS[key]}</strong>
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                    <p className="checkout-hint">
                      Formalités douanières et taxes selon le pays de destination.
                    </p>
                  </>
                )}
              </section>

              <section
                className="checkout-block-card checkout-block-card--bill"
                aria-labelledby="dv-info"
              >
                <div className="checkout-block-card__head">
                  <strong id="dv-info">Informations complémentaires</strong>
                </div>
                <div className="checkout-field">
                  <label htmlFor="dv-message">Commentaire</label>
                  <textarea
                    id="dv-message"
                    maxLength={2000}
                    rows={4}
                    placeholder="Contraintes, conditionnement, autres informations utiles…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="devis-files">
                  <label htmlFor="dv-files" className="checkout-add-addr">
                    Documents complémentaires
                  </label>
                  <input
                    id="dv-files"
                    type="file"
                    accept=".pdf,.xls,.xlsx,image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingFile}
                    onChange={(e) => void onFileChange(e.target.files)}
                  />
                  <p className="checkout-hint">
                    PDF, Excel ou image — max. 10 Mo par fichier.
                  </p>
                  {attachments.map((file) => (
                    <span key={file.fileUrl} className="devis-file-chip">
                      {file.localName || file.fileName || 'Document'}
                      <button
                        type="button"
                        aria-label="Retirer le fichier"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((f) => f.fileUrl !== file.fileUrl),
                          )
                        }
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div className="checkout-summary checkout-summary--actions">
            {formError ? (
              <p className="checkout-form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              ref={ctaRef}
              type="submit"
              className="checkout-cta"
              disabled={submitting}
            >
              {submitting ? 'Traitement…' : 'Envoyer ma demande'}
            </button>
            <p className="checkout-hint" style={{ textAlign: 'center' }}>
              Votre demande sera transmise à notre équipe commerciale pour
              étude.
            </p>
          </div>
        </form>

        <div
          className={`checkout-sticky${stickyVisible ? ' is-visible' : ''}`}
          aria-hidden={!stickyVisible}
        >
          <div className="checkout-sticky__total">
            <span>Demande</span>
            <strong>
              {lines.length} produit{lines.length > 1 ? 's' : ''}
            </strong>
          </div>
          <button
            type="button"
            className="checkout-sticky__cta"
            disabled={submitting}
            tabIndex={stickyVisible ? undefined : -1}
            onClick={() => void placeRequest()}
          >
            {submitting ? '…' : 'Envoyer'}
          </button>
        </div>
      </div>
      {pickerOpen ? (
        <div className="devis-drawer-root" role="presentation">
          <button
            type="button"
            className="devis-drawer-backdrop"
            aria-label="Fermer"
            onClick={() => setPickerOpen(false)}
          />
          <div
            className="devis-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dv-picker-title"
          >
            <div className="devis-drawer__head">
              <h2 id="dv-picker-title">Ajouter des produits</h2>
              <button
                type="button"
                className="devis-drawer__close"
                aria-label="Fermer"
                onClick={() => setPickerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="devis-drawer__search">
              <label className="devis-sr-only" htmlFor="dv-picker-q">
                Rechercher un produit
              </label>
              <input
                id="dv-picker-q"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Rechercher un produit…"
                autoFocus
              />
            </div>
            <div className="devis-drawer__list">
              {pickerLoading ? (
                <p className="devis-drawer__loading">Recherche…</p>
              ) : pickerItems.length === 0 ? (
                <p className="devis-drawer__empty">
                  Aucun produit ne correspond à votre recherche.
                </p>
              ) : (
                pickerItems.map((item) => {
                  const already = lines.some((l) => l.productId === item.id);
                  return (
                    <div key={item.id} className="devis-pick">
                      <div className="devis-pick__media">
                        {mediaUrl(item.image?.url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(item.image?.url) ?? undefined}
                            alt=""
                          />
                        ) : (
                          <Search size={16} aria-hidden />
                        )}
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.brand?.name ?? item.sku}</span>
                      </div>
                      <button
                        type="button"
                        disabled={already}
                        onClick={() => {
                          addProductLine(
                            lineFromProduct({
                              id: item.id,
                              name: item.name,
                              slug: item.slug,
                              brand: item.brand?.name ?? null,
                              imageUrl: item.image?.url ?? null,
                              purchaseMode: normalizePurchaseMode(
                                item.purchaseMode,
                              ),
                              packaging: item.packaging,
                              unitsPerCarton: item.unitsPerCarton,
                              hybridThresholdQty: item.hybridThresholdQty,
                            }),
                          );
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.products;
                            return next;
                          });
                          toast.push(`${item.name} ajouté`);
                        }}
                      >
                        {already ? 'Ajouté' : 'Ajouter'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function DevisPage() {
  return (
    <RequireAuth roles={QUOTE_ROLES} forbiddenFallback={<ProQuotesNotice />}>
      {(user) => (
        <Suspense
          fallback={
            <main className="checkout-page">
              <div className="checkout-shell">
                <div className="checkout-state">
                  <h2>Chargement…</h2>
                </div>
              </div>
            </main>
          }
        >
          <DevisInner user={user} />
        </Suspense>
      )}
    </RequireAuth>
  );
}
