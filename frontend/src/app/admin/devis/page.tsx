'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  api,
  asList,
  formatPrice,
  statusLabel,
  type QuoteSummary,
} from '@/lib/api';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import {
  companyOf,
} from './quote-helpers';

export default function AdminQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api<QuoteSummary[] | { items: QuoteSummary[] }>('/admin/quotes')
      .then((data) => {
        setQuotes(asList(data));
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur devis'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return quotes.filter((quote) => {
      if (!query) return true;
      const hay = [
        quote.number,
        companyOf(quote),
        quote.contactEmail,
        quote.contactPhone,
        quote.destinationCountry,
        quote.user?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [quotes, q]);

  function exportCsv() {
    const rows = [
      ['Réf', 'Société', 'Contact', 'Email', 'Pays', 'Statut', 'Total', 'Date'],
      ...filtered.map((quote) => [
        quote.number ?? quote.id,
        companyOf(quote),
        quote.contactName ?? '',
        quote.contactEmail ?? '',
        quote.destinationCountry,
        statusLabel(quote.status),
        quote.total != null ? String(quote.total) : '',
        formatAdminDate(quote.createdAt),
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
    a.download = 'devis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Devis</h1>
          <p>
            {quotes.length} demande{quotes.length > 1 ? 's' : ''} · ouvrez une
            ligne pour tarifer et envoyer.
          </p>
        </div>
        <div className="ad-actions">
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={13} aria-hidden /> Actualiser
          </button>
          <button
            type="button"
            className="ad-btn ad-btn--ghost ad-btn--sm"
            onClick={exportCsv}
          >
            <Download size={13} aria-hidden /> Export CSV
          </button>
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-toolbar">
        <input
          className="ad-search"
          placeholder="N°, société, e-mail, pays…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Réf.</th>
              <th>Société</th>
              <th>Pays</th>
              <th>Total</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((quote) => (
              <tr
                key={quote.id}
                className="ad-row-click"
                onClick={() => router.push(`/admin/devis/${quote.id}`)}
              >
                <td>
                  <strong>{quote.number ?? quote.id.slice(0, 8)}</strong>
                  {quote.items?.length ? (
                    <span className="ad-muted">
                      {' '}
                      · {quote.items.length} ligne
                      {quote.items.length > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </td>
                <td>{companyOf(quote)}</td>
                <td>{quote.destinationCountry}</td>
                <td>
                  {quote.total != null
                    ? formatPrice(quote.total, quote.currency ?? 'MAD')
                    : '—'}
                </td>
                <td>
                  <span
                    className={`ad-badge ad-badge--${toneForStatus(quote.status)}`}
                  >
                    {statusLabel(quote.status)}
                  </span>
                </td>
                <td>{formatAdminDate(quote.createdAt)}</td>
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
            Aucun devis.
          </p>
        ) : null}
      </div>
    </div>
  );
}
