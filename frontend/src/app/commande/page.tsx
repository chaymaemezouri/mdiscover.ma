'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  LockKeyhole,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { RequireAuth } from '@/components/RequireAuth';
import { useShopOptional } from '@/components/shop/ShopProvider';
import { useToast } from '@/components/shop/ToastProvider';
import {
  api,
  formatPrice,
  isProAccount,
  mediaUrl,
  type Address,
  type BankTransferInitResponse,
  type CartResponse,
  type CheckoutOrderResponse,
  type SafeUser,
} from '@/lib/api';
import './commande.css';

type DeliveryMode = 'STANDARD' | 'EXPRESS' | 'PICKUP';
type ActivePayment = 'BANK_TRANSFER' | 'COD';
type FieldErrors = Record<string, string>;

type ContactState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type AddressForm = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
};

const EMPTY_ADDR: AddressForm = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'MA',
  phone: '',
};

const DELIVERY_MODE: DeliveryMode = 'STANDARD';

function isMorocco(country: string) {
  return (
    country.trim().toUpperCase() === 'MA' ||
    country.trim().toLowerCase() === 'maroc'
  );
}

function itemImage(item: CartResponse['items'][number]) {
  return (
    item.product.image?.url ??
    item.product.images?.find((img) => img.isPrimary)?.url ??
    item.product.images?.[0]?.url ??
    null
  );
}

function itemUnitPrice(item: CartResponse['items'][number]) {
  if (typeof item.unitPrice === 'number') return item.unitPrice;
  return Number(item.product.promoPrice ?? item.product.price ?? 0);
}

function itemLineTotal(item: CartResponse['items'][number]) {
  if (typeof item.lineTotal === 'number') return item.lineTotal;
  return itemUnitPrice(item) * item.quantity;
}

function deliveryLabel(_mode?: DeliveryMode) {
  return 'Livraison';
}

function paymentLabel(method: ActivePayment) {
  return method === 'COD' ? 'Paiement à la livraison' : 'Paiement bancaire';
}

function formatAddressLines(
  address: Address | undefined,
  fallback: AddressForm,
): { title: string; lines: string[] } {
  if (address) {
    return {
      title: `${address.city}${address.isDefault ? ' · Défaut' : ''}`,
      lines: [
        address.line1,
        [address.postalCode, address.city, address.region]
          .filter(Boolean)
          .join(' · '),
        address.country,
      ].filter(Boolean),
    };
  }
  return {
    title: fallback.city || 'Nouvelle adresse',
    lines: [
      fallback.line1,
      [fallback.postalCode, fallback.city, fallback.region]
        .filter(Boolean)
        .join(' · '),
      fallback.country,
    ].filter(Boolean),
  };
}

function CheckoutInner({ user }: { user: SafeUser }) {
  const router = useRouter();
  const toast = useToast();
  const shop = useShopOptional();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showNewShipping, setShowNewShipping] = useState(false);
  const [showNewBilling, setShowNewBilling] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [acceptedCgv, setAcceptedCgv] = useState(false);
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [billingAddressId, setBillingAddressId] = useState('');
  const deliveryMode = DELIVERY_MODE;
  const [paymentMethod, setPaymentMethod] =
    useState<ActivePayment>('BANK_TRANSFER');
  const [customerNote, setCustomerNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [contact, setContact] = useState<ContactState>(() => ({
    firstName: user.individualProfile?.firstName ?? '',
    lastName: user.individualProfile?.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
  }));
  const [shippingForm, setShippingForm] = useState<AddressForm>({
    ...EMPTY_ADDR,
    phone: user.phone ?? '',
  });
  const [billingForm, setBillingForm] = useState<AddressForm>(EMPTY_ADDR);

  const shippingAddresses = useMemo(
    () => addresses.filter((a) => a.type === 'SHIPPING' || !a.type),
    [addresses],
  );
  const billingAddresses = useMemo(
    () => addresses.filter((a) => a.type === 'BILLING'),
    [addresses],
  );

  const selectedShipping = shippingAddresses.find(
    (a) => a.id === shippingAddressId,
  );

  const loadCart = useCallback(
    async (opts?: {
      city?: string;
      region?: string;
      deliveryMode?: DeliveryMode;
    }) => {
      const params = new URLSearchParams();
      if (opts?.city) params.set('city', opts.city);
      if (opts?.region) params.set('region', opts.region);
      if (opts?.deliveryMode) params.set('deliveryMode', opts.deliveryMode);
      const qs = params.toString();
      return api<CartResponse>(`/cart${qs ? `?${qs}` : ''}`);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFormError(null);
      try {
        const [cartData, addressData] = await Promise.all([
          loadCart({ deliveryMode: 'STANDARD' }),
          api<Address[]>('/users/me/addresses'),
        ]);
        if (cancelled) return;
        setCart(cartData);
        setAddresses(addressData);

        const shippingList = addressData.filter(
          (a) => a.type === 'SHIPPING' || !a.type,
        );
        const billingList = addressData.filter((a) => a.type === 'BILLING');
        const defaultShip =
          shippingList.find((a) => a.isDefault) ?? shippingList[0] ?? null;
        const defaultBill =
          billingList.find((a) => a.isDefault) ?? billingList[0] ?? null;

        if (defaultShip) {
          setShippingAddressId(defaultShip.id);
          setShowNewShipping(false);
          setContact((prev) =>
            prev.phone
              ? prev
              : { ...prev, phone: defaultShip.phone ?? prev.phone },
          );
        } else {
          setShowNewShipping(true);
        }
        if (defaultBill) setBillingAddressId(defaultBill.id);
      } catch (err) {
        if (!cancelled) {
          setFormError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger le checkout',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCart]);

  useEffect(() => {
    if (!selectedShipping?.city) return;
    let cancelled = false;
    loadCart({
      city: selectedShipping.city,
      region: selectedShipping.region ?? undefined,
      deliveryMode,
    })
      .then((next) => {
        if (!cancelled) setCart(next);
      })
      .catch(() => {
        /* keep previous totals */
      });
    return () => {
      cancelled = true;
    };
  }, [shippingAddressId, deliveryMode, selectedShipping, loadCart]);

  async function createAddress(form: AddressForm, type: 'SHIPPING' | 'BILLING') {
    return api<Address>('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        type,
        label: form.label || undefined,
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        city: form.city.trim(),
        region: form.region.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || 'MA',
        phone: form.phone.trim() || contact.phone.trim() || undefined,
        isDefault:
          type === 'SHIPPING'
            ? shippingAddresses.length === 0
            : billingAddresses.length === 0,
      }),
    });
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!contact.firstName.trim()) next.firstName = 'Prénom requis';
    if (!contact.lastName.trim()) next.lastName = 'Nom requis';
    if (
      !contact.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
    ) {
      next.email = 'Email invalide';
    }
    if (!contact.phone.trim() || contact.phone.trim().length < 8) {
      next.phone = 'Téléphone requis';
    }

    if (!shippingAddressId || showNewShipping) {
      if (!shippingForm.line1.trim()) next.shipLine1 = 'Adresse requise';
      if (!shippingForm.city.trim()) next.shipCity = 'Ville requise';
      if (!shippingForm.country.trim()) next.shipCountry = 'Pays requis';
      if (!(shippingForm.phone.trim() || contact.phone.trim())) {
        next.shipPhone = 'Téléphone de livraison requis';
      }
    }

    if (!billingSame && (!billingAddressId || showNewBilling)) {
      if (!billingForm.line1.trim())
        next.billLine1 = 'Adresse de facturation requise';
      if (!billingForm.city.trim()) next.billCity = 'Ville requise';
    }

    if (!acceptedCgv) next.cgv = 'Veuillez accepter les conditions générales';

    setFieldErrors(next);
    if (Object.keys(next).length === 0) return true;

    const firstKey = Object.keys(next)[0];
    const el = document.querySelector(`[data-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  async function placeOrder(e?: FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      let shipId = shippingAddressId;
      if (!shipId || showNewShipping) {
        const created = await createAddress(
          {
            ...shippingForm,
            phone: shippingForm.phone.trim() || contact.phone.trim(),
          },
          'SHIPPING',
        );
        shipId = created.id;
        setAddresses((prev) => [...prev, created]);
        setShippingAddressId(created.id);
        setShowNewShipping(false);
      }

      let billId: string | undefined;
      if (!billingSame) {
        billId = billingAddressId;
        if (!billId || showNewBilling) {
          const createdBill = await createAddress(billingForm, 'BILLING');
          billId = createdBill.id;
          setAddresses((prev) => [...prev, createdBill]);
          setBillingAddressId(createdBill.id);
          setShowNewBilling(false);
        }
      }

      const noteParts = [
        customerNote.trim(),
        `Contact: ${contact.firstName} ${contact.lastName} · ${contact.email} · ${contact.phone}`,
      ].filter(Boolean);

      const order = await api<CheckoutOrderResponse>('/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddressId: shipId,
          billingAddressId: billId,
          deliveryMode,
          paymentMethod,
          customerNote: noteParts.join('\n') || undefined,
        }),
      });

      await shop?.refreshCart?.();
      shop?.setCartCount?.(0);

      if (paymentMethod === 'BANK_TRANSFER') {
        const payment = await api<BankTransferInitResponse>(
          '/payments/bank-transfer/initiate',
          {
            method: 'POST',
            body: JSON.stringify({ orderId: order.id }),
          },
        );
        sessionStorage.setItem(
          `checkout-bank-${order.id}`,
          JSON.stringify(payment.bankDetails),
        );
        sessionStorage.setItem(
          `checkout-instructions-${order.id}`,
          payment.instructions ?? '',
        );
      }

      router.push(`/commande/succes?orderId=${order.id}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de finaliser la commande';
      setFormError(message);
      toast.push(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const items = cart?.items ?? [];
  const currency = cart?.totals?.currency ?? cart?.currency ?? 'MAD';
  const totals = cart?.totals;
  const visibleItems = showAllItems ? items : items.slice(0, 4);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const ctaLabel = 'Confirmer la commande';

  const secureCopy =
    paymentMethod === 'COD'
      ? 'Paiement à régler à la livraison'
      : 'Commande traitée après confirmation du virement';

  const shipDisplay = formatAddressLines(selectedShipping, shippingForm);

  function stepVisualState(index: number): 'done' | 'active' | 'pending' {
    if (index === 0) return 'done';
    if (acceptedCgv) {
      if (index === 1) return 'done';
      if (index === 2) return 'active';
      return 'pending';
    }
    if (index === 1) return 'active';
    return 'pending';
  }

  function scrollToSection(sectionId: string) {
    setAcceptedCgv(false);
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }

  if (loading) {
    return (
      <main className="checkout-page" aria-busy="true">
        <div className="checkout-shell">
          <div className="checkout-skeleton checkout-layout">
            <div className="checkout-main">
              <div className="checkout-skeleton__block" />
              <div className="checkout-skeleton__block" />
              <div className="checkout-skeleton__block" />
            </div>
            <div className="checkout-skeleton__block checkout-skeleton__block--side" />
          </div>
          <span className="checkout-sr-only">Chargement du checkout…</span>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-shell">
          <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <Link href="/panier">Panier</Link>
            <span aria-hidden>/</span>
            <span aria-current="page">Commande</span>
          </nav>
          <section className="checkout-empty">
            <ShoppingBag size={28} aria-hidden />
            <h2>Votre panier est vide</h2>
            <p>Ajoutez des produits avant de finaliser votre commande.</p>
            <Link href="/catalogue">Explorer le catalogue</Link>
          </section>
        </div>
      </main>
    );
  }

  const productCards = (
    <div className="checkout-product-cards">
      {(acceptedCgv ? items : visibleItems).map((item) => {
        const src = mediaUrl(itemImage(item));
        return (
          <article className="checkout-product-card" key={item.id}>
            <div className="checkout-product-card__media">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" loading="lazy" />
              ) : (
                <span>DISC</span>
              )}
            </div>
            <div className="checkout-product-card__body">
              <span className="checkout-product-card__cat">
                {item.product.category?.nameFr ?? 'Produit'}
              </span>
              <strong>{item.product.nameFr}</strong>
              {item.product.packaging ? (
                <span className="checkout-product-card__meta">
                  {item.product.packaging}
                </span>
              ) : null}
              <span className="checkout-product-card__qty">
                Qté ×{item.quantity}
              </span>
            </div>
            <div className="checkout-product-card__price">
              {formatPrice(itemLineTotal(item), currency)}
            </div>
          </article>
        );
      })}
      {!acceptedCgv && items.length > 4 ? (
        <button
          type="button"
          className="checkout-items-more"
          onClick={() => setShowAllItems((v) => !v)}
        >
          {showAllItems ? 'Réduire' : `Voir les ${items.length} produits`}
        </button>
      ) : null}
    </div>
  );

  const totalsBlock = totals ? (
    <div className="checkout-totals">
      <div>
        <span>Sous-total</span>
        <span>{formatPrice(totals.subtotal, currency)}</span>
      </div>
      {totals.discount > 0 ? (
        <div className="checkout-totals__discount">
          <span>Remise</span>
          <span>−{formatPrice(totals.discount, currency)}</span>
        </div>
      ) : null}
      <div>
        <span>TVA</span>
        <span>{formatPrice(totals.taxAmount, currency)}</span>
      </div>
      <div className="checkout-totals__grand">
        <span>Total</span>
        <span>{formatPrice(totals.total, currency)}</span>
      </div>
    </div>
  ) : null;

  const orderSummary = (
    <div
      className={`checkout-summary checkout-summary--totals${summaryOpen ? ' is-open' : ''}`}
      aria-labelledby="ck-summary-title"
    >
      <button
        type="button"
        className="checkout-summary__head"
        aria-expanded={summaryOpen}
        onClick={() => setSummaryOpen((v) => !v)}
      >
        <strong id="ck-summary-title">Résumé de la commande</strong>
        <ChevronDown
          size={18}
          aria-hidden
          className={summaryOpen ? 'is-open' : undefined}
        />
      </button>
      <div className="checkout-summary__body">
        {cart?.promoCode ? (
          <div className="checkout-promo">
            <span>
              <Check size={14} aria-hidden /> Code {cart.promoCode.code}
            </span>
            <Link href="/panier">Modifier</Link>
          </div>
        ) : null}
        {totalsBlock}
      </div>
    </div>
  );

  const cartOverview = (
    <div className="checkout-cart-row">
      {productCards}
      {orderSummary}
    </div>
  );

  const checkoutActions = (
    <div className="checkout-summary checkout-summary--actions">
      {formError ? (
        <p className="checkout-form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <label className="checkout-check" data-field="cgv">
        <input
          type="checkbox"
          checked={acceptedCgv}
          onChange={(e) => setAcceptedCgv(e.target.checked)}
        />
        <span>
          J’ai lu et j’accepte les{' '}
          <Link href="/legal/cgv" target="_blank">
            conditions générales de vente
          </Link>
        </span>
      </label>
      {fieldErrors.cgv ? (
        <p className="checkout-field__error">{fieldErrors.cgv}</p>
      ) : null}
      <button
        type="submit"
        className="checkout-cta"
        disabled={submitting}
      >
        {submitting ? 'Traitement…' : ctaLabel}
      </button>
      <p className="checkout-secure">
        <LockKeyhole size={14} aria-hidden />
        {secureCopy}
      </p>
    </div>
  );

  const infoGrid = (
    <div className="checkout-info-grid">
      <div className="checkout-info-card">
        <div className="checkout-info-card__head">
          <strong>Client</strong>
        </div>
        <p>{contact.firstName} {contact.lastName}</p>
        <p className="checkout-info-card__muted">
          {itemCount} produit{itemCount > 1 ? 's' : ''}
        </p>
      </div>
      <div className="checkout-info-card">
        <div className="checkout-info-card__head">
          <strong>Coordonnées</strong>
          <button type="button" className="checkout-edit-btn" onClick={() => scrollToSection('ck-contact')}>
            <Pencil size={14} aria-hidden />
            Modifier
          </button>
        </div>
        <p>{contact.email}</p>
        <p>{contact.phone}</p>
      </div>
      <div className="checkout-info-card">
        <div className="checkout-info-card__head">
          <strong>Livraison</strong>
          <button type="button" className="checkout-edit-btn" onClick={() => scrollToSection('ck-ship')}>
            <Pencil size={14} aria-hidden />
            Modifier
          </button>
        </div>
        <p>{shipDisplay.title}</p>
        {shipDisplay.lines.map((line) => (
          <p key={line} className="checkout-info-card__muted">{line}</p>
        ))}
        <p className="checkout-info-card__muted">{deliveryLabel(deliveryMode)}</p>
      </div>
      <div className="checkout-info-card">
        <div className="checkout-info-card__head">
          <strong>Facturation & paiement</strong>
          <button type="button" className="checkout-edit-btn" onClick={() => scrollToSection('ck-pay')}>
            <Pencil size={14} aria-hidden />
            Modifier
          </button>
        </div>
        <p>
          {billingSame
            ? 'Identique à l’adresse de livraison'
            : 'Adresse de facturation distincte'}
        </p>
        <p className="checkout-info-card__muted">{paymentLabel(paymentMethod)}</p>
      </div>
    </div>
  );

  return (
    <main className="checkout-page has-mobile-action-bar">
      <div className="checkout-shell">
        <nav className="checkout-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <Link href="/panier">Panier</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Commande</span>
        </nav>

        <header className="checkout-head">
          <h1>Finaliser ma commande</h1>
          <p>
            Renseignez vos informations de livraison et choisissez votre mode de
            paiement.
          </p>
          <div className="checkout-stepper" role="list" aria-label="Progression">
            {[
              { label: 'Panier' },
              { label: 'Livraison & paiement' },
              { label: 'Récapitulatif' },
              { label: 'Terminé' },
            ].map((step, i, arr) => {
              const state = stepVisualState(i);
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

        <form className="checkout-flow" onSubmit={placeOrder} noValidate>
          {acceptedCgv ? (
            <div className="checkout-review">
              <p className="checkout-review__ref">Récapitulatif</p>
              <p className="checkout-review__lead">
                Vérifiez votre commande avant confirmation.
              </p>
              {cartOverview}
              {infoGrid}
              {checkoutActions}
            </div>
          ) : (
            <>
              {cartOverview}
              <div className="checkout-main">
            <section className="checkout-section" aria-labelledby="ck-contact">
              <h2 className="checkout-section__title" id="ck-contact">
                <span className="checkout-section__index">01 /</span>
                Coordonnées
              </h2>
              <p className="checkout-section__desc">
                Informations de contact pour le suivi de votre commande.
              </p>
              <div className="checkout-fields checkout-fields--2">
                <div className="checkout-field" data-field="firstName">
                  <label htmlFor="ck-firstName">Prénom</label>
                  <input
                    id="ck-firstName"
                    className={fieldErrors.firstName ? 'is-invalid' : undefined}
                    value={contact.firstName}
                    onChange={(e) =>
                      setContact((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    autoComplete="given-name"
                    aria-invalid={Boolean(fieldErrors.firstName)}
                  />
                  {fieldErrors.firstName ? (
                    <p className="checkout-field__error">
                      {fieldErrors.firstName}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field" data-field="lastName">
                  <label htmlFor="ck-lastName">Nom</label>
                  <input
                    id="ck-lastName"
                    className={fieldErrors.lastName ? 'is-invalid' : undefined}
                    value={contact.lastName}
                    onChange={(e) =>
                      setContact((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName ? (
                    <p className="checkout-field__error">
                      {fieldErrors.lastName}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field" data-field="email">
                  <label htmlFor="ck-email">Email</label>
                  <input
                    id="ck-email"
                    type="email"
                    className={fieldErrors.email ? 'is-invalid' : undefined}
                    value={contact.email}
                    onChange={(e) =>
                      setContact((prev) => ({ ...prev, email: e.target.value }))
                    }
                    autoComplete="email"
                  />
                  {fieldErrors.email ? (
                    <p className="checkout-field__error">{fieldErrors.email}</p>
                  ) : null}
                </div>
                <div className="checkout-field" data-field="phone">
                  <label htmlFor="ck-phone">Téléphone</label>
                  <input
                    id="ck-phone"
                    type="tel"
                    className={fieldErrors.phone ? 'is-invalid' : undefined}
                    value={contact.phone}
                    onChange={(e) =>
                      setContact((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    autoComplete="tel"
                  />
                  {fieldErrors.phone ? (
                    <p className="checkout-field__error">{fieldErrors.phone}</p>
                  ) : null}
                </div>
              </div>

              {user.professionalProfile ? (
                <div className="checkout-readonly">
                  <strong>Entreprise</strong>
                  <div>{user.professionalProfile.companyName}</div>
                  {user.professionalProfile.ice ? (
                    <div>ICE : {user.professionalProfile.ice}</div>
                  ) : null}
                  {user.professionalProfile.taxId ? (
                    <div>IF : {user.professionalProfile.taxId}</div>
                  ) : null}
                </div>
              ) : null}

              {isProAccount(user) ? (
                <p className="checkout-devis">
                  <span>Besoin de volumes importants ?</span>{' '}
                  <Link href="/devis">Demander un devis ↗</Link>
                </p>
              ) : null}
            </section>

            <div className="checkout-block-grid">
              <section
                className="checkout-block-card checkout-block-card--ship"
                aria-labelledby="ck-ship"
              >
                <div className="checkout-block-card__head">
                  <strong id="ck-ship">Adresse de livraison</strong>
                  <button
                    type="button"
                    className="checkout-edit-btn"
                    onClick={() => setShowNewShipping(true)}
                  >
                    <Pencil size={14} aria-hidden />
                    Modifier
                  </button>
                </div>
                <div
                  className="checkout-minis"
                  role="radiogroup"
                  aria-label="Adresses enregistrées"
                >
                  {shippingAddresses.map((address) => {
                    const isSelected =
                      shippingAddressId === address.id && !showNewShipping;
                    return (
                      <button
                        key={address.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`checkout-mini${
                          isSelected ? ' is-active' : ''
                        }${!isSelected ? ' is-collapsed' : ''}`}
                        onClick={() => {
                          setShippingAddressId(address.id);
                          setShowNewShipping(false);
                        }}
                      >
                        <span>
                          <strong>
                            {address.label || address.city}
                            {address.isDefault ? ' · Défaut' : ''}
                          </strong>
                          {isSelected ? (
                            <p className="checkout-mini__address">
                              {address.line1}
                              {address.line2 ? `, ${address.line2}` : ''}
                              <br />
                              {address.postalCode ? `${address.postalCode} ` : ''}
                              {address.city}
                              {address.region ? `, ${address.region}` : ''}
                              <br />
                              {address.country}
                              {address.phone ? ` · ${address.phone}` : ''}
                            </p>
                          ) : (
                            <p className="checkout-mini__address">
                              {address.line1}, {address.city}
                            </p>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="checkout-add-addr"
                  onClick={() => setShowNewShipping(true)}
                >
                  <Plus size={14} aria-hidden />
                  Ajouter une adresse
                </button>
              </section>

              <section
                className="checkout-block-card checkout-block-card--priority checkout-block-card--delivery"
                aria-labelledby="ck-delivery"
              >
                <div className="checkout-block-card__head">
                  <strong id="ck-delivery">Livraison</strong>
                </div>
                <div className="checkout-minis">
                  <div className="checkout-mini is-active checkout-mini--delivery">
                    <span>
                      <strong>Livraison</strong>
                      <p>Livraison au Maroc selon votre adresse.</p>
                    </span>
                  </div>
                </div>
                <p className="checkout-hint">
                  Les frais de livraison se règlent directement avec le livreur.
                </p>
              </section>

              <section
                className="checkout-block-card checkout-block-card--priority checkout-block-card--pay"
                aria-labelledby="ck-pay"
              >
                <div className="checkout-block-card__head">
                  <strong id="ck-pay">Paiement</strong>
                </div>
                <div
                  className="checkout-minis"
                  role="radiogroup"
                  aria-label="Modes de paiement"
                  data-field="paymentMethod"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'BANK_TRANSFER'}
                    className={`checkout-mini${
                      paymentMethod === 'BANK_TRANSFER' ? ' is-active' : ''
                    }`}
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  >
                    <span>
                      <strong>Paiement bancaire</strong>
                      <p>Virement — traitement après confirmation</p>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'COD'}
                    className={`checkout-mini${
                      paymentMethod === 'COD' ? ' is-active' : ''
                    }`}
                    onClick={() => setPaymentMethod('COD')}
                  >
                    <span>
                      <strong>Paiement à la livraison</strong>
                      <p>Réglez au moment de la réception</p>
                    </span>
                  </button>
                </div>
                {paymentMethod === 'BANK_TRANSFER' ? (
                  <p className="checkout-note" id="ck-bank-note">
                    <Check size={14} aria-hidden />
                    Les instructions de virement seront communiquées après
                    validation.
                  </p>
                ) : (
                  <p className="checkout-note" id="ck-cod-note">
                    <Check size={14} aria-hidden />
                    Vous payez à la réception. Les frais de livraison se
                    règlent avec le livreur.
                  </p>
                )}
                {fieldErrors.paymentMethod ? (
                  <p className="checkout-field__error">
                    {fieldErrors.paymentMethod}
                  </p>
                ) : null}
              </section>

              <section
                className="checkout-block-card checkout-block-card--billing checkout-block-card--bill"
                aria-labelledby="ck-bill"
              >
                <div className="checkout-block-card__head">
                  <strong id="ck-bill">Facturation</strong>
                  {!billingSame ? (
                    <button
                      type="button"
                      className="checkout-edit-btn"
                      onClick={() => setBillingSame(true)}
                    >
                      <Pencil size={14} aria-hidden />
                      Modifier
                    </button>
                  ) : null}
                </div>
                <label className="checkout-check">
                  <input
                    type="checkbox"
                    checked={billingSame}
                    onChange={(e) => setBillingSame(e.target.checked)}
                  />
                  <span>Identique à l’adresse de livraison</span>
                </label>
                {!billingSame ? (
                  <>
                    {billingAddresses.length > 0 ? (
                      <div className="checkout-minis" role="radiogroup">
                        {billingAddresses.map((address) => (
                          <button
                            key={address.id}
                            type="button"
                            role="radio"
                            aria-checked={
                              billingAddressId === address.id && !showNewBilling
                            }
                            className={`checkout-mini${
                              billingAddressId === address.id && !showNewBilling
                                ? ' is-active'
                                : ''
                            }`}
                            onClick={() => {
                              setBillingAddressId(address.id);
                              setShowNewBilling(false);
                            }}
                          >
                            <span>
                              <strong>{address.label || address.city}</strong>
                              <p>
                                {address.line1}, {address.city}
                              </p>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="checkout-add-addr"
                      onClick={() => setShowNewBilling(true)}
                    >
                      <Plus size={14} aria-hidden />
                      Nouvelle adresse
                    </button>
                    {showNewBilling || billingAddresses.length === 0 ? (
                      <div className="checkout-block-expand">
                        <div className="checkout-field" data-field="billLine1">
                          <label htmlFor="ck-bill-line1">Adresse</label>
                          <input
                            id="ck-bill-line1"
                            value={billingForm.line1}
                            onChange={(e) =>
                              setBillingForm((prev) => ({
                                ...prev,
                                line1: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="checkout-fields checkout-fields--2">
                          <div className="checkout-field" data-field="billCity">
                            <label htmlFor="ck-bill-city">Ville</label>
                            <input
                              id="ck-bill-city"
                              value={billingForm.city}
                              onChange={(e) =>
                                setBillingForm((prev) => ({
                                  ...prev,
                                  city: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="checkout-field">
                            <label htmlFor="ck-bill-postal">Code postal</label>
                            <input
                              id="ck-bill-postal"
                              value={billingForm.postalCode}
                              onChange={(e) =>
                                setBillingForm((prev) => ({
                                  ...prev,
                                  postalCode: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div className="checkout-field">
                          <label htmlFor="ck-bill-country">Pays</label>
                          <input
                            id="ck-bill-country"
                            value={billingForm.country}
                            onChange={(e) =>
                              setBillingForm((prev) => ({
                                ...prev,
                                country: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            </div>

            {showNewShipping || shippingAddresses.length === 0 ? (
              <div className="checkout-fields checkout-block-form">
                <div className="checkout-field" data-field="shipCountry">
                  <label htmlFor="ck-ship-country">Pays</label>
                  <select
                    id="ck-ship-country"
                    value={shippingForm.country}
                    onChange={(e) =>
                      setShippingForm((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  >
                    <option value="MA">Maroc</option>
                    <option value="FR">France</option>
                    <option value="ES">Espagne</option>
                    <option value="BE">Belgique</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div className="checkout-field">
                  <label htmlFor="ck-ship-label">Libellé (optionnel)</label>
                  <input
                    id="ck-ship-label"
                    placeholder="Bureau, Entrepôt…"
                    value={shippingForm.label}
                    onChange={(e) =>
                      setShippingForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="checkout-field" data-field="shipLine1">
                  <label htmlFor="ck-ship-line1">Adresse</label>
                  <input
                    id="ck-ship-line1"
                    className={
                      fieldErrors.shipLine1 ? 'is-invalid' : undefined
                    }
                    value={shippingForm.line1}
                    onChange={(e) =>
                      setShippingForm((prev) => ({
                        ...prev,
                        line1: e.target.value,
                      }))
                    }
                    autoComplete="address-line1"
                  />
                  {fieldErrors.shipLine1 ? (
                    <p className="checkout-field__error">
                      {fieldErrors.shipLine1}
                    </p>
                  ) : null}
                </div>
                <div className="checkout-field">
                  <label htmlFor="ck-ship-line2">Complément d’adresse</label>
                  <input
                    id="ck-ship-line2"
                    value={shippingForm.line2}
                    onChange={(e) =>
                      setShippingForm((prev) => ({
                        ...prev,
                        line2: e.target.value,
                      }))
                    }
                    autoComplete="address-line2"
                  />
                </div>
                <div className="checkout-fields checkout-fields--2">
                  <div className="checkout-field" data-field="shipCity">
                    <label htmlFor="ck-ship-city">Ville</label>
                    <input
                      id="ck-ship-city"
                      className={
                        fieldErrors.shipCity ? 'is-invalid' : undefined
                      }
                      value={shippingForm.city}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      autoComplete="address-level2"
                    />
                    {fieldErrors.shipCity ? (
                      <p className="checkout-field__error">
                        {fieldErrors.shipCity}
                      </p>
                    ) : null}
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="ck-ship-region">
                      {isMorocco(shippingForm.country)
                        ? 'Région / Province'
                        : 'État / Région'}
                    </label>
                    <input
                      id="ck-ship-region"
                      value={shippingForm.region}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          region: e.target.value,
                        }))
                      }
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div className="checkout-fields checkout-fields--2">
                  <div className="checkout-field">
                    <label htmlFor="ck-ship-postal">Code postal</label>
                    <input
                      id="ck-ship-postal"
                      value={shippingForm.postalCode}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          postalCode: e.target.value,
                        }))
                      }
                      autoComplete="postal-code"
                    />
                  </div>
                  <div className="checkout-field" data-field="shipPhone">
                    <label htmlFor="ck-ship-phone">Téléphone</label>
                    <input
                      id="ck-ship-phone"
                      className={
                        fieldErrors.shipPhone ? 'is-invalid' : undefined
                      }
                      value={shippingForm.phone}
                      onChange={(e) =>
                        setShippingForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      autoComplete="tel"
                    />
                    {fieldErrors.shipPhone ? (
                      <p className="checkout-field__error">
                        {fieldErrors.shipPhone}
                      </p>
                    ) : null}
                  </div>
                </div>
                {!isMorocco(shippingForm.country) ? (
                  <p className="checkout-hint">
                    Selon le pays de destination, des taxes, droits de douane
                    ou frais d’importation peuvent s’appliquer.
                  </p>
                ) : null}
              </div>
            ) : null}

            <section
              className="checkout-section checkout-section--compact"
              aria-labelledby="ck-note"
            >
              <button
                type="button"
                className="checkout-expand-trigger"
                aria-expanded={instructionsOpen}
                aria-controls="ck-note-panel"
                onClick={() => setInstructionsOpen((open) => !open)}
              >
                <span id="ck-note">Instructions de livraison</span>
                {instructionsOpen ? (
                  <Minus size={18} aria-hidden />
                ) : (
                  <Plus size={18} aria-hidden />
                )}
              </button>
              {instructionsOpen ? (
                <div className="checkout-expand" id="ck-note-panel">
                  <div className="checkout-field">
                    <label htmlFor="ck-note-input" className="checkout-sr-only">
                      Instructions de livraison
                    </label>
                    <textarea
                      id="ck-note-input"
                      maxLength={500}
                      rows={3}
                      placeholder="Horaires, accès, personne à contacter…"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </section>
              </div>
              {checkoutActions}
            </>
          )}
        </form>

        <div className="checkout-sticky" role="region" aria-label="Confirmer la commande">
          <div className="checkout-sticky__total">
            <span>Total</span>
            <strong>
              {totals ? formatPrice(totals.total, currency) : '—'}
            </strong>
          </div>
          <button
            type="button"
            className="checkout-sticky__cta"
            disabled={submitting}
            onClick={() => void placeOrder()}
          >
            {submitting ? '…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth next="/commande">
      {(user) => <CheckoutInner user={user} />}
    </RequireAuth>
  );
}
