'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  api,
  apiDownload,
  asList,
  formatPrice,
} from '@/lib/api';
import { formatAdminDate } from '../admin-utils';
import { useAdminConfirm } from '../AdminConfirm';

type Tab = 'boutique' | 'marques' | 'promos' | 'import' | 'journal';

type Setting = { id: string; key: string; value: string };
type Brand = {
  id: string;
  name: string;
  slugFr?: string;
  descriptionFr?: string | null;
  isActive?: boolean;
};
type Promo = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  value: string | number;
  minOrderAmount?: string | number | null;
  maxUses?: number | null;
  usedCount?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};
type Audit = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  user?: { email?: string | null } | null;
};
type ImportResult = {
  dryRun?: boolean;
  total?: number;
  created?: number;
  updated?: number;
  errors?: Array<{ row: number; sku: string; error: string }>;
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'boutique', label: 'Boutique' },
  { id: 'marques', label: 'Marques' },
  { id: 'promos', label: 'Promos' },
  { id: 'import', label: 'Import CSV' },
  { id: 'journal', label: 'Journal' },
];

const COMPANY_DEFAULTS = {
  'company.legalName': 'MDISCOVER IMPEX FOOD',
  'company.tagline': 'Import · Export · Agroalimentaire',
  'company.address': 'Hay Khat Ramla 01, Av. Idriss 01, Laâyoune, Maroc',
  'company.city': 'Laâyoune',
  'company.phone': '+212 661-52-86-08',
  'company.email': 'contact@mdiscover.ma',
  'company.web': 'www.mdiscover.ma',
  'company.hours': 'Lun–Ven · 9h00–18h00',
  'company.ice': '',
  'company.if': '',
  'company.rc': '',
  'ops.lowStockThreshold': '10',
  'ops.quoteValidityDays': '15',
};

const CSV_TEMPLATE = `nameFr,price,categorySlugFr,sku,nameEn,promoPrice,stockQty,purchaseMode,brandSlugFr,isActive,originCountry,packaging
Huile d'olive 5L,189,huiles,,Huile d'olive 5L,,24,DIRECT,,true,MA,Bidon 5L
`;

const ACTION_LABELS: Record<string, string> = {
  SETTING_UPSERTED: 'Paramètre mis à jour',
  CATEGORY_CREATED: 'Catégorie créée',
  CATEGORY_UPDATED: 'Catégorie modifiée',
  CATEGORY_DELETED: 'Catégorie supprimée',
  PRODUCT_CREATED: 'Produit créé',
  PRODUCT_UPDATED: 'Produit modifié',
  PRODUCT_DELETED: 'Produit supprimé',
  PRODUCT_DEACTIVATED: 'Produit désactivé',
  PRODUCTS_CSV_IMPORTED: 'Import catalogue',
  BRAND_CREATED: 'Marque créée',
  BRAND_UPDATED: 'Marque modifiée',
  BRAND_DELETED: 'Marque supprimée',
  ORDER_STATUS_UPDATED: 'Statut commande',
  PAYMENT_CONFIRMED: 'Paiement confirmé',
  PROMO_CREATED: 'Code promo créé',
  PROMO_UPDATED: 'Code promo modifié',
};

function val(map: Record<string, string>, key: keyof typeof COMPANY_DEFAULTS) {
  return map[key] ?? COMPANY_DEFAULTS[key] ?? '';
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase();
}

const ENTITY_LABELS: Record<string, string> = {
  Product: 'Produit',
  Category: 'Catégorie',
  Brand: 'Marque',
  SystemSetting: 'Paramètre',
  PromoCode: 'Promo',
  Order: 'Commande',
  Payment: 'Paiement',
  Quote: 'Devis',
  User: 'Utilisateur',
};

export default function AdminSettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('boutique');
  const [map, setMap] = useState<Record<string, string>>({ ...COMPANY_DEFAULTS });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [logs, setLogs] = useState<Audit[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useAdminConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [promoForm, setPromoForm] = useState({
    code: '',
    type: 'PERCENT' as Promo['type'],
    value: '',
    minOrderAmount: '',
    maxUses: '',
  });
  const [csv, setCsv] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  function flash(message: string) {
    setSuccess(message);
    setError(null);
    window.setTimeout(() => setSuccess(null), 3200);
  }

  function load() {
    setLoading(true);
    Promise.all([
      api<Setting[]>('/admin/settings').catch(() => []),
      api<Brand[]>('/admin/brands').catch(() => []),
      api<Promo[]>('/admin/promos').catch(() => []),
      api<Audit[]>('/admin/audit-logs?take=200').catch(() => []),
    ])
      .then(([settings, brandList, promoList, audit]) => {
        const next: Record<string, string> = { ...COMPANY_DEFAULTS };
        asList<Setting>(settings).forEach((s) => {
          next[s.key] = s.value;
        });
        setMap(next);
        setBrands(asList<Brand>(brandList));
        setPromos(asList<Promo>(promoList));
        setLogs(asList<Audit>(audit));
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Impossible de charger les réglages'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) =>
      [
        actionLabel(log.action),
        log.action,
        log.entity,
        log.user?.email,
        log.entityId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [logs, q]);

  function patch(key: keyof typeof COMPANY_DEFAULTS, value: string) {
    setMap((prev) => ({ ...prev, [key]: value }));
  }

  async function saveKeys(keys: Array<keyof typeof COMPANY_DEFAULTS>, message: string) {
    setSaving(true);
    setError(null);
    try {
      await api('/admin/settings/bulk', {
        method: 'PUT',
        body: JSON.stringify({
          items: keys.map((key) => ({ key, value: map[key] ?? '' })),
        }),
      });
      flash(message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function addBrand() {
    if (brandName.trim().length < 2) {
      setError('Le nom de la marque est requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/admin/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: brandName.trim(),
          descriptionFr: brandDesc.trim() || undefined,
        }),
      });
      setBrandName('');
      setBrandDesc('');
      flash('Marque créée.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création marque impossible');
    } finally {
      setSaving(false);
    }
  }

  async function toggleBrand(brand: Brand) {
    setSaving(true);
    try {
      await api(`/admin/brands/${brand.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: brand.isActive === false }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour marque impossible');
    } finally {
      setSaving(false);
    }
  }

  async function removeBrand(brand: Brand) {
    const ok = await confirm({
      title: 'Supprimer cette marque ?',
      description: `« ${brand.name} » sera retirée. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api(`/admin/brands/${brand.id}`, { method: 'DELETE' });
      flash('Marque supprimée.');
      load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.includes('products')
            ? 'Cette marque a des produits. Désactivez-la plutôt.'
            : e.message
          : 'Suppression impossible',
      );
    } finally {
      setSaving(false);
    }
  }

  async function addPromo() {
    if (promoForm.code.trim().length < 2) {
      setError('Indiquez un code promo.');
      return;
    }
    const value = Number(promoForm.value);
    if (!Number.isFinite(value) || value < 0) {
      setError('Indiquez une valeur valide.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api('/admin/promos', {
        method: 'POST',
        body: JSON.stringify({
          code: promoForm.code.trim().toUpperCase(),
          type: promoForm.type,
          value,
          minOrderAmount: promoForm.minOrderAmount
            ? Number(promoForm.minOrderAmount)
            : undefined,
          maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined,
        }),
      });
      setPromoForm({
        code: '',
        type: 'PERCENT',
        value: '',
        minOrderAmount: '',
        maxUses: '',
      });
      flash('Code promo créé.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création promo impossible');
    } finally {
      setSaving(false);
    }
  }

  async function togglePromo(promo: Promo) {
    setSaving(true);
    try {
      await api(`/admin/promos/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: promo.isActive === false }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour promo impossible');
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(dryRun: boolean) {
    if (csv.trim().length < 10) {
      setError('Collez ou importez un fichier CSV.');
      return;
    }
    setSaving(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await api<ImportResult>('/admin/import/products', {
        method: 'POST',
        body: JSON.stringify({ csv, dryRun }),
      });
      setImportResult(result);
      flash(
        dryRun
          ? 'Simulation terminée.'
          : `${result.created ?? 0} créé(s), ${result.updated ?? 0} mis à jour.`,
      );
      if (!dryRun) load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible');
    } finally {
      setSaving(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([`\uFEFF${CSV_TEMPLATE}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-produits.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="ad-loading">Chargement des réglages…</p>;

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Réglages</h1>
          <p>Coordonnées boutique, marques, codes promo et import catalogue.</p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-icon-btn"
            title="Actualiser"
            aria-label="Actualiser"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}
      {success ? <p className="ad-success">{success}</p> : null}

      <div className="ad-chips">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ad-chip${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'boutique' ? (
        <div className="ad-grid-2 ad-grid-2--eq">
          <section className="ad-card">
            <h2>Identité & contact</h2>
            <p className="ad-item__meta" style={{ marginBottom: '0.85rem' }}>
              Utilisé sur les devis PDF et les informations de contact.
            </p>
            <div className="ad-form">
              <label className="ad-field">
                <span>Raison sociale</span>
                <input
                  className="ad-input"
                  value={val(map, 'company.legalName')}
                  onChange={(e) => patch('company.legalName', e.target.value)}
                />
              </label>
              <label className="ad-field">
                <span>Accroche</span>
                <input
                  className="ad-input"
                  value={val(map, 'company.tagline')}
                  onChange={(e) => patch('company.tagline', e.target.value)}
                />
              </label>
              <label className="ad-field">
                <span>Adresse</span>
                <textarea
                  className="ad-textarea"
                  rows={3}
                  value={val(map, 'company.address')}
                  onChange={(e) => patch('company.address', e.target.value)}
                />
              </label>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Ville</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.city')}
                    onChange={(e) => patch('company.city', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>Téléphone</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.phone')}
                    onChange={(e) => patch('company.phone', e.target.value)}
                  />
                </label>
              </div>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>E-mail</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.email')}
                    onChange={(e) => patch('company.email', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>Site web</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.web')}
                    onChange={(e) => patch('company.web', e.target.value)}
                  />
                </label>
              </div>
              <label className="ad-field">
                <span>Horaires</span>
                <input
                  className="ad-input"
                  value={val(map, 'company.hours')}
                  onChange={(e) => patch('company.hours', e.target.value)}
                />
              </label>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>ICE</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.ice')}
                    onChange={(e) => patch('company.ice', e.target.value)}
                  />
                </label>
                <label className="ad-field">
                  <span>IF</span>
                  <input
                    className="ad-input"
                    value={val(map, 'company.if')}
                    onChange={(e) => patch('company.if', e.target.value)}
                  />
                </label>
              </div>
              <label className="ad-field">
                <span>RC</span>
                <input
                  className="ad-input"
                  value={val(map, 'company.rc')}
                  onChange={(e) => patch('company.rc', e.target.value)}
                />
              </label>
              <button
                type="button"
                className="ad-btn"
                disabled={saving}
                onClick={() =>
                  void saveKeys(
                    [
                      'company.legalName',
                      'company.tagline',
                      'company.address',
                      'company.city',
                      'company.phone',
                      'company.email',
                      'company.web',
                      'company.hours',
                      'company.ice',
                      'company.if',
                      'company.rc',
                    ],
                    'Coordonnées enregistrées.',
                  )
                }
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </section>

          <section className="ad-card">
            <h2>Exploitation</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Seuil stock bas</span>
                <input
                  className="ad-input"
                  type="number"
                  min="0"
                  value={val(map, 'ops.lowStockThreshold')}
                  onChange={(e) =>
                    patch('ops.lowStockThreshold', e.target.value)
                  }
                />
              </label>
              <label className="ad-field">
                <span>Validité devis (jours)</span>
                <input
                  className="ad-input"
                  type="number"
                  min="1"
                  value={val(map, 'ops.quoteValidityDays')}
                  onChange={(e) =>
                    patch('ops.quoteValidityDays', e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                className="ad-btn"
                disabled={saving}
                onClick={() =>
                  void saveKeys(
                    ['ops.lowStockThreshold', 'ops.quoteValidityDays'],
                    'Paramètres d’exploitation enregistrés.',
                  )
                }
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            <h2 style={{ marginTop: '1.4rem' }}>Exports</h2>
            <p className="ad-item__meta" style={{ marginBottom: '0.75rem' }}>
              Téléchargements CSV pour la comptabilité et le catalogue.
            </p>
            <div className="ad-actions">
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() =>
                  void apiDownload('/admin/export/products', 'produits.csv')
                }
              >
                <Download size={13} /> Produits
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() =>
                  void apiDownload('/admin/export/customers', 'clients.csv')
                }
              >
                <Download size={13} /> Clients
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() =>
                  void apiDownload('/admin/export/orders', 'commandes.csv')
                }
              >
                <Download size={13} /> Commandes
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--ghost ad-btn--sm"
                onClick={() =>
                  void apiDownload('/admin/export/sales-report', 'ventes.csv')
                }
              >
                <Download size={13} /> Ventes
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'marques' ? (
        <div className="ad-grid-2">
          <section className="ad-card">
            <h2>Nouvelle marque</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Nom *</span>
                <input
                  className="ad-input"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </label>
              <label className="ad-field">
                <span>Description</span>
                <textarea
                  className="ad-textarea"
                  rows={3}
                  value={brandDesc}
                  onChange={(e) => setBrandDesc(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="ad-btn"
                disabled={saving}
                onClick={() => void addBrand()}
              >
                Créer la marque
              </button>
            </div>
          </section>
          <section className="ad-card">
            <div className="ad-card__head">
              <h2>Marques ({brands.length})</h2>
            </div>
            {brands.length === 0 ? (
              <p className="ad-empty">Aucune marque. Le slug est généré automatiquement.</p>
            ) : (
              <div className="ad-list">
                {brands.map((brand) => (
                  <article key={brand.id} className="ad-item">
                    <div className="ad-card__head" style={{ marginBottom: 0 }}>
                      <div>
                        <strong>{brand.name}</strong>
                        <p className="ad-item__meta">
                          {brand.slugFr ?? '—'}
                          {brand.isActive === false ? ' · inactive' : ''}
                        </p>
                      </div>
                      <div className="ad-actions">
                        <button
                          type="button"
                          className="ad-btn ad-btn--ghost ad-btn--sm"
                          disabled={saving}
                          onClick={() => void toggleBrand(brand)}
                        >
                          {brand.isActive === false ? 'Activer' : 'Désactiver'}
                        </button>
                        <button
                          type="button"
                          className="ad-icon-btn"
                          title="Supprimer"
                          disabled={saving}
                          onClick={() => void removeBrand(brand)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'promos' ? (
        <div className="ad-grid-2">
          <section className="ad-card">
            <h2>Nouveau code</h2>
            <div className="ad-form">
              <label className="ad-field">
                <span>Code *</span>
                <input
                  className="ad-input"
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm({ ...promoForm, code: e.target.value })
                  }
                  placeholder="EX. RAMADAN10"
                />
              </label>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Type</span>
                  <select
                    className="ad-select"
                    value={promoForm.type}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        type: e.target.value as Promo['type'],
                      })
                    }
                  >
                    <option value="PERCENT">Pourcentage</option>
                    <option value="FIXED">Montant fixe</option>
                    <option value="FREE_SHIPPING">Livraison offerte</option>
                  </select>
                </label>
                <label className="ad-field">
                  <span>
                    {promoForm.type === 'PERCENT' ? 'Valeur %' : 'Valeur MAD'}
                  </span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    value={promoForm.value}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, value: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="ad-form ad-form--2">
                <label className="ad-field">
                  <span>Minimum commande</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="0"
                    value={promoForm.minOrderAmount}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        minOrderAmount: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="ad-field">
                  <span>Utilisations max</span>
                  <input
                    className="ad-input"
                    type="number"
                    min="1"
                    value={promoForm.maxUses}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, maxUses: e.target.value })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="ad-btn"
                disabled={saving}
                onClick={() => void addPromo()}
              >
                Créer le code
              </button>
            </div>
          </section>
          <section className="ad-card">
            <h2>Codes ({promos.length})</h2>
            {promos.length === 0 ? (
              <p className="ad-empty">Aucun code promo.</p>
            ) : (
              <div className="ad-table-wrap" style={{ boxShadow: 'none', border: 0 }}>
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Réduction</th>
                      <th>Usage</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((promo) => (
                      <tr key={promo.id}>
                        <td>
                          <strong>{promo.code}</strong>
                          <div className="ad-muted">
                            {promo.isActive === false ? 'Inactif' : 'Actif'}
                          </div>
                        </td>
                        <td>
                          {promo.type === 'PERCENT'
                            ? `${promo.value} %`
                            : promo.type === 'FREE_SHIPPING'
                              ? 'Livraison offerte'
                              : formatPrice(promo.value)}
                        </td>
                        <td>
                          {promo.usedCount ?? 0}
                          {promo.maxUses ? ` / ${promo.maxUses}` : ''}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ad-btn ad-btn--ghost ad-btn--sm"
                            disabled={saving}
                            onClick={() => void togglePromo(promo)}
                          >
                            {promo.isActive === false ? 'Activer' : 'Désactiver'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'import' ? (
        <section className="ad-card ad-uploader-card">
          <div className="ad-card__head">
            <h2>Import produits CSV</h2>
            <button
              type="button"
              className="ad-card__link"
              onClick={downloadTemplate}
            >
              Télécharger le modèle
            </button>
          </div>
          <p className="ad-item__meta" style={{ marginBottom: '0.85rem' }}>
            Colonnes requises : nom, prix, slug de catégorie. SKU, slug et SEO
            sont générés s’ils sont vides. Simulez avant d’importer.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="ad-uploader__input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              file.text().then((text) => {
                setCsv(text);
                flash(`Fichier « ${file.name} » chargé.`);
              });
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="ad-uploader"
            style={{ minHeight: '8rem' }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={22} aria-hidden />
            <strong>Choisir un fichier CSV</strong>
            <span>Ou collez le contenu ci-dessous.</span>
          </button>
          <textarea
            className="ad-textarea"
            style={{ minHeight: '12rem', marginTop: '0.85rem' }}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="nameFr,price,categorySlugFr,..."
          />
          <div className="ad-actions" style={{ marginTop: '0.85rem' }}>
            <button
              type="button"
              className="ad-btn ad-btn--ghost"
              disabled={saving}
              onClick={() => void importCsv(true)}
            >
              Simuler
            </button>
            <button
              type="button"
              className="ad-btn"
              disabled={saving}
              onClick={() => void importCsv(false)}
            >
              Importer
            </button>
          </div>
          {importResult ? (
            <div style={{ marginTop: '1rem' }}>
              <p>
                {importResult.dryRun ? 'Simulation' : 'Import'} ·{' '}
                {importResult.total ?? 0} ligne
                {(importResult.total ?? 0) > 1 ? 's' : ''} ·{' '}
                {importResult.created ?? 0} créé
                {(importResult.created ?? 0) > 1 ? 's' : ''} ·{' '}
                {importResult.updated ?? 0} mis à jour ·{' '}
                {importResult.errors?.length ?? 0} erreur
                {(importResult.errors?.length ?? 0) > 1 ? 's' : ''}
              </p>
              {importResult.errors?.length ? (
                <ul className="ad-doc-list" style={{ marginTop: '0.65rem' }}>
                  {importResult.errors.map((err, i) => (
                    <li key={`${err.row}-${i}`}>
                      Ligne {err.row}
                      {err.sku ? ` · ${err.sku}` : ''} — {err.error}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ad-empty">Aucune erreur.</p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'journal' ? (
        <div>
          <div className="ad-search-wrap">
            <Search size={16} aria-hidden />
            <input
              className="ad-search"
              placeholder="Action, entité, e-mail…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q ? (
              <button
                type="button"
                className="ad-search-clear"
                onClick={() => setQ('')}
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <p className="ad-search-meta">
            {filteredLogs.length} événement
            {filteredLogs.length > 1 ? 's' : ''}
          </p>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatAdminDate(log.createdAt)}</td>
                    <td>
                      <strong>{actionLabel(log.action)}</strong>
                    </td>
                    <td>
                      {ENTITY_LABELS[log.entity] ?? log.entity}
                      {log.entityId ? (
                        <span className="ad-muted">
                          {' '}
                          · {log.entityId.slice(0, 8)}
                        </span>
                      ) : null}
                    </td>
                    <td>{log.user?.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 ? (
              <p className="ad-empty" style={{ padding: '1rem' }}>
                Aucun événement.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {dialog}
    </div>
  );
}
