'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FileText, FolderTree, Package, RefreshCw, Wallet } from 'lucide-react';
import {
  api,
  apiDownload,
  asList,
  formatPrice,
  statusLabel,
  type AdminDashboard,
  type OrderSummary,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from './admin-utils';

type SalesStats = {
  totals: { orders: number; revenue: number };
  series: Array<{ date: string; orders: number; revenue: number }>;
};

type TopProduct = {
  productId: string;
  sku: string;
  nameFr: string;
  qty: number;
  revenue: number;
};

type Audit = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: { email?: string | null } | null;
};

const QUEUES = [
  { key: 'pendingQuotes', label: 'Devis', href: '/admin/devis' },
  { key: 'awaitingPayments', label: 'Paiements', href: '/admin/paiements' },
  { key: 'customersProPending', label: 'Pros', href: '/admin/clients' },
  { key: 'pendingReviews', label: 'Avis', href: '/admin/contenu' },
  { key: 'openShipments', label: 'Expéditions', href: '/admin/commandes' },
] as const;

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fillSeries(
  days: number,
  series: Array<{ date: string; orders: number; revenue: number }>,
) {
  const map = new Map(series.map((row) => [row.date.slice(0, 10), row]));
  const filled: Array<{ date: string; orders: number; revenue: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = ymd(date);
    filled.push(map.get(key) ?? { date: key, orders: 0, revenue: 0 });
  }
  return filled;
}

const ACTION_LABELS: Record<string, string> = {
  SETTING_UPSERTED: 'Paramètre mis à jour',
  CATEGORY_CREATED: 'Catégorie créée',
  PRODUCT_CREATED: 'Produit créé',
  ORDER_STATUS_UPDATED: 'Statut commande',
  PAYMENT_CONFIRMED: 'Paiement confirmé',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [sales, setSales] = useState<SalesStats | null>(null);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [logs, setLogs] = useState<Audit[]>([]);
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load(period: 7 | 14 | 30 = days) {
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - period);
    const qs = `?from=${from.toISOString()}&to=${new Date().toISOString()}`;

    Promise.all([
      api<AdminDashboard>('/admin/dashboard'),
      api<SalesStats>(`/admin/stats/sales${qs}`).catch(() => null),
      api<TopProduct[]>(`/admin/stats/top-products${qs}`).catch(
        (): TopProduct[] => [],
      ),
      api<OrderSummary[] | { items: OrderSummary[] }>('/admin/orders').catch(
        (): OrderSummary[] => [],
      ),
      api<Audit[]>('/admin/audit-logs?take=8').catch((): Audit[] => []),
    ])
      .then(([dash, stats, products, orderList, audit]) => {
        setData(dash);
        setSales(stats);
        setTop(asList<TopProduct>(products).slice(0, 6));
        setOrders(asList<OrderSummary>(orderList).slice(0, 6));
        setLogs(asList<Audit>(audit).slice(0, 6));
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Erreur dashboard'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const series = useMemo(
    () => fillSeries(days, sales?.series ?? []),
    [days, sales],
  );
  const maxRevenue = useMemo(
    () => Math.max(...series.map((row) => row.revenue), 1),
    [series],
  );

  async function exportCsv(path: string, filename: string) {
    setExporting(filename);
    try {
      await apiDownload(path, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(null);
    }
  }

  if (error && !data) return <p className="ad-error">{error}</p>;
  if (!data) return <p className="ad-loading">Chargement du dashboard…</p>;

  const avg =
    data.kpis.paidOrdersMonth > 0
      ? data.kpis.revenueMonth / data.kpis.paidOrdersMonth
      : 0;
  const attention = QUEUES.reduce((sum, q) => sum + data.queues[q.key], 0);

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Vue d’ensemble</h1>
          <p>
            {attention > 0
              ? `${attention} élément${attention > 1 ? 's' : ''} à traiter aujourd’hui.`
              : 'Aucune file d’attente en attente.'}
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-icon-btn"
            title="Actualiser"
            aria-label="Actualiser"
            disabled={loading}
            onClick={() => load(days)}
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            disabled={exporting !== null}
            onClick={() =>
              void exportCsv('/admin/export/orders', 'commandes.csv')
            }
          >
            Export commandes
          </button>
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            disabled={exporting !== null}
            onClick={() =>
              void exportCsv('/admin/export/sales-report', 'ventes.csv')
            }
          >
            Rapport ventes
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-kpis">
        <div className="ad-kpi">
          <strong>{formatPrice(data.kpis.revenueMonth)}</strong>
          <span>CA du mois</span>
          {avg > 0 ? <em>Panier moyen {formatPrice(avg)}</em> : null}
        </div>
        <Link href="/admin/commandes" className="ad-kpi">
          <strong>{data.kpis.ordersToday}</strong>
          <span>Commandes aujourd’hui</span>
        </Link>
        <Link href="/admin/produits" className="ad-kpi">
          <strong>{data.kpis.productsActive}</strong>
          <span>Produits actifs</span>
        </Link>
        <Link href="/admin/produits" className={`ad-kpi${data.kpis.lowStock > 0 ? ' is-alert' : ''}`}>
          <strong>{data.kpis.lowStock}</strong>
          <span>Stock bas</span>
          {data.kpis.lowStock > 0 ? <em>À réapprovisionner</em> : null}
        </Link>
      </div>

      <div className="ad-shortcuts">
        <Link href="/admin/produits/nouveau" className="ad-shortcut">
          <Package size={15} aria-hidden /> Nouveau produit
        </Link>
        <Link href="/admin/produits?tab=categories" className="ad-shortcut">
          <FolderTree size={15} aria-hidden /> Catégories
        </Link>
        <Link href="/admin/paiements" className="ad-shortcut">
          <Wallet size={15} aria-hidden /> Paiements
        </Link>
        <Link href="/admin/devis" className="ad-shortcut">
          <FileText size={15} aria-hidden /> Devis
        </Link>
      </div>

      <h2 className="ad-section-title">À traiter</h2>
      <div className="ad-queues">
        {QUEUES.map((q) => {
          const value = data.queues[q.key];
          return (
            <Link
              key={q.key}
              href={q.href}
              className={`ad-queue${value > 0 ? ' is-hot' : ''}`}
            >
              <span>{q.label}</span>
              <strong>{value}</strong>
            </Link>
          );
        })}
      </div>

      <div className="ad-grid-2">
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>
              Ventes
              {sales?.totals ? ` · ${formatPrice(sales.totals.revenue)}` : ''}
            </h2>
            <div className="ad-period">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={days === d ? 'is-active' : ''}
                  onClick={() => setDays(d)}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
          {series.every((row) => row.revenue === 0) ? (
            <p className="ad-empty">Pas encore de ventes sur cette période.</p>
          ) : (
            <div
              className={`ad-bars${days === 30 ? ' ad-bars--dense' : ''}`}
              aria-label={`Ventes ${days} derniers jours`}
            >
              {series.map((row, index) => {
                const showLabel =
                  days < 30 ||
                  index === 0 ||
                  index === series.length - 1 ||
                  index % 7 === 0;
                return (
                  <div
                    key={row.date}
                    className="ad-spark"
                    title={`${new Date(row.date).toLocaleDateString('fr-MA', {
                      day: 'numeric',
                      month: 'short',
                    })} · ${formatPrice(row.revenue)} · ${row.orders} cmd`}
                  >
                    <div
                      className="ad-spark__bar"
                      style={{
                        height: `${Math.max(4, (row.revenue / maxRevenue) * 108)}px`,
                      }}
                    />
                    <span>{showLabel ? row.date.slice(8) : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="ad-card">
          <div className="ad-card__head">
            <h2>Dernières commandes</h2>
            <Link href="/admin/commandes" className="ad-card__link">
              Tout voir
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="ad-empty">Aucune commande récente.</p>
          ) : (
            <div className="ad-feed">
              {orders.map((order) => (
                <Link key={order.id} href={`/admin/commandes/${order.id}`}>
                  <div className="ad-feed__meta">
                    <strong>{order.number}</strong>
                    <span>{formatAdminDate(order.createdAt)}</span>
                  </div>
                  <div className="ad-feed__end">
                    <strong>{formatPrice(order.total, order.currency)}</strong>
                    <span>
                      <span
                        className={`ad-badge ad-badge--${toneForStatus(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="ad-grid-2">
        <section className="ad-card">
          <div className="ad-card__head">
            <h2>Meilleures ventes</h2>
            <Link href="/admin/produits" className="ad-card__link">
              Catalogue
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="ad-empty">
              Pas encore de ventes produits.{' '}
              <Link href="/admin/produits/nouveau" className="ad-card__link">
                Ajouter un produit
              </Link>
            </p>
          ) : (
            <div className="ad-table-wrap" style={{ border: 0 }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produit</th>
                    <th>Qté</th>
                    <th>CA</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((p) => (
                    <tr key={p.productId}>
                      <td>{p.sku}</td>
                      <td>{p.nameFr}</td>
                      <td>{p.qty}</td>
                      <td>{formatPrice(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="ad-card">
          <h2>Statuts & activité</h2>
          <div className="ad-chips" style={{ marginBottom: '0.75rem' }}>
            {Object.entries(data.ordersByStatus).map(([status, count]) => (
              <span
                key={status}
                className={`ad-badge ad-badge--${toneForStatus(status)}`}
              >
                {statusLabel(status)} · {count}
              </span>
            ))}
            {Object.keys(data.ordersByStatus).length === 0 ? (
              <span className="ad-empty">Aucune commande.</span>
            ) : null}
          </div>
          {logs.length === 0 ? (
            <p className="ad-empty">Pas encore d’activité.</p>
          ) : (
            <div className="ad-feed">
              {logs.map((log) => (
                <div key={log.id}>
                  <div className="ad-feed__meta">
                    <strong>{ACTION_LABELS[log.action] ?? log.action}</strong>
                    <span>{log.user?.email ?? log.entity}</span>
                  </div>
                  <span>{formatAdminDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
