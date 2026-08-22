'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  api,
  formatPrice,
  statusLabel,
  type PaymentRecord,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import { payLabel, paymentClientName } from './payment-helpers';

type Provider = PaymentRecord['provider'];

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [provider, setProvider] = useState<Provider | ''>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api<PaymentRecord[]>('/payments/admin')
      .then((list) => {
        setPayments(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Impossible de charger les paiements'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (provider && p.provider !== provider) return false;
      if (!query) return true;
      const hay = [
        p.order?.number,
        paymentClientName(p),
        p.order?.user?.email,
        p.providerRef,
        p.provider,
        String(p.amount),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [payments, provider, q]);

  const providers = useMemo(
    () => [...new Set(payments.map((p) => p.provider))],
    [payments],
  );

  function exportCsv() {
    const rows = [
      ['Date', 'Commande', 'Client', 'Email', 'Moyen', 'Montant', 'Devise', 'Statut'],
      ...filtered.map((p) => [
        formatAdminDate(p.createdAt),
        p.order?.number ?? p.orderId,
        paymentClientName(p),
        p.order?.user?.email ?? '',
        statusLabel(p.provider),
        String(p.amount),
        p.currency,
        payLabel(p.status),
      ]),
    ];
    const csv = rows
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'),
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paiements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Paiements</h1>
          <p>
            {payments.length} paiement{payments.length > 1 ? 's' : ''} ·
            virements et encaissements.
          </p>
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
          <button
            type="button"
            className="ad-icon-btn"
            title="Export CSV"
            aria-label="Export CSV"
            onClick={exportCsv}
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-toolbar">
        <input
          className="ad-search"
          placeholder="N° commande, client, email, référence…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {providers.length > 1 ? (
          <select
            className="ad-select"
            style={{ maxWidth: '13rem' }}
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider | '')}
          >
            <option value="">Tous les moyens</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {statusLabel(p)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Client</th>
              <th>Moyen</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="ad-row-click"
                onClick={() => router.push(`/admin/paiements/${p.id}`)}
              >
                <td>
                  <strong>{p.order?.number ?? p.orderId.slice(0, 8)}</strong>
                  {p.proofUrl ? (
                    <span className="ad-muted"> · justificatif</span>
                  ) : null}
                </td>
                <td>{paymentClientName(p)}</td>
                <td>{statusLabel(p.provider)}</td>
                <td>{formatPrice(p.amount, p.currency)}</td>
                <td>
                  <span className={`ad-badge ad-badge--${toneForStatus(p.status)}`}>
                    {payLabel(p.status)}
                  </span>
                </td>
                <td>{formatAdminDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Chargement…
          </p>
        ) : filtered.length === 0 ? (
          <p className="ad-empty" style={{ padding: '1rem' }}>
            Aucun paiement.
          </p>
        ) : null}
      </div>
    </div>
  );
}
