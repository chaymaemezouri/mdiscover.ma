'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, EyeOff, ExternalLink, RefreshCw, Search, Trash2, User, X } from 'lucide-react';
import { api, mediaUrl, type AdminReview } from '@/lib/api';
import { StarRating } from '@/components/reviews/StarRating';
import { formatAdminDate, toneForStatus } from '../admin-utils';
import { useAdminConfirm } from '../AdminConfirm';

type FilterId = 'all' | 'pending' | 'published' | 'hidden';

const FILTERS: Array<{
  id: FilterId;
  label: string;
  match: (review: AdminReview) => boolean;
}> = [
  { id: 'all', label: 'Tous', match: () => true },
  {
    id: 'pending',
    label: 'En attente',
    match: (r) => !r.isApproved,
  },
  {
    id: 'published',
    label: 'Publiés',
    match: (r) => r.isApproved && r.isVisible,
  },
  {
    id: 'hidden',
    label: 'Masqués',
    match: (r) => r.isApproved && !r.isVisible,
  },
];

function reviewStatus(review: AdminReview) {
  if (!review.isApproved) return { label: 'En attente', tone: 'PENDING' };
  if (!review.isVisible) return { label: 'Masqué', tone: 'BLOCKED' };
  return { label: 'Publié', tone: 'APPROVED' };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [filter, setFilter] = useState<FilterId>('pending');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, dialog } = useAdminConfirm();

  function load() {
    setLoading(true);
    api<AdminReview[]>('/reviews/admin')
      .then((list) => {
        setReviews(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erreur avis');
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
    const query = q.trim().toLowerCase();
    return reviews.filter((review) => {
      if (!active.match(review)) return false;
      if (!query) return true;
      const hay = [
        review.product.nameFr,
        review.product.sku,
        review.authorName,
        review.authorEmail,
        review.title,
        review.comment,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [reviews, filter, q]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map((f) => [f.id, reviews.filter((r) => f.match(r)).length]),
      ) as Record<FilterId, number>,
    [reviews],
  );

  async function moderate(
    id: string,
    action: 'approve' | 'hide' | 'reject',
  ) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/reviews/admin/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify(
          action === 'approve'
            ? { isApproved: true, isVisible: true }
            : action === 'hide'
              ? { isApproved: true, isVisible: false }
              : { isApproved: false, isVisible: false },
        ),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modération impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function removeReview(id: string) {
    const ok = await confirm({
      title: 'Supprimer cet avis ?',
      description:
        'L’avis sera définitivement retiré. Cette action ne peut pas être annulée.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setBusyId(id);
    setError(null);
    try {
      await api(`/reviews/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="ad-page-head">
        <div>
          <h1>Avis</h1>
          <p>
            {reviews.length} avis · modération avant publication sur les fiches
            produit.
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
        </div>
      </div>

      {error ? <p className="ad-error">{error}</p> : null}

      <div className="ad-chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`ad-chip${filter === f.id ? ' is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label} · {counts[f.id] ?? 0}
          </button>
        ))}
      </div>

      <label className="ad-search-wrap">
        <Search size={18} strokeWidth={1.8} aria-hidden />
        <input
          className="ad-search"
          placeholder="Rechercher produit, client, commentaire…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q ? (
          <button
            type="button"
            className="ad-search-clear"
            aria-label="Effacer la recherche"
            onClick={() => setQ('')}
          >
            <X size={12} />
          </button>
        ) : null}
      </label>
      {q.trim() ? (
        <p className="ad-search-meta">
          {filtered.length} avis trouvé{filtered.length > 1 ? 's' : ''}
        </p>
      ) : null}

      {loading ? (
        <p className="ad-loading">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="ad-empty">Aucun avis sur ce filtre.</p>
      ) : (
        <div className="ad-list">
          {filtered.map((review) => {
            const status = reviewStatus(review);
            return (
              <article key={review.id} className="ad-item">
                <div className="ad-item__top">
                  <div>
                    <StarRating value={review.rating} size={14} />
                    <strong style={{ marginLeft: '0.5rem' }}>
                      {review.product.nameFr}
                    </strong>
                    <p className="ad-item__meta">
                      {review.authorName} · {review.authorEmail} ·{' '}
                      {formatAdminDate(review.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`ad-badge ad-badge--${toneForStatus(status.tone)}`}
                  >
                    {status.label}
                  </span>
                </div>
                {review.title ? (
                  <p>
                    <strong>{review.title}</strong>
                  </p>
                ) : null}
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    color: '#6e7f96',
                    fontSize: '0.88rem',
                  }}
                >
                  {review.comment ?? 'Sans commentaire'}
                </p>
                {review.photos?.length ? (
                  <div className="ad-review-photos">
                    {review.photos.map((photo) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={mediaUrl(photo.fileUrl) ?? photo.fileUrl}
                        alt=""
                      />
                    ))}
                  </div>
                ) : null}
                <div className="ad-item__actions">
                  <Link
                    className="ad-icon-btn"
                    href={`/produits/${review.product.slugFr}`}
                    target="_blank"
                    title="Voir le produit"
                    aria-label="Voir le produit"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  {review.userId ? (
                    <Link
                      className="ad-icon-btn"
                      href={`/admin/clients/${review.userId}`}
                      title="Fiche client"
                      aria-label="Fiche client"
                    >
                      <User size={14} />
                    </Link>
                  ) : null}
                  {!review.isApproved || !review.isVisible ? (
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title="Publier"
                      aria-label="Publier"
                      disabled={busyId === review.id}
                      onClick={() => void moderate(review.id, 'approve')}
                    >
                      <Check size={14} />
                    </button>
                  ) : null}
                  {review.isVisible ? (
                    <button
                      type="button"
                      className="ad-icon-btn"
                      title="Masquer"
                      aria-label="Masquer"
                      disabled={busyId === review.id}
                      onClick={() => void moderate(review.id, 'hide')}
                    >
                      <EyeOff size={14} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ad-icon-btn is-danger"
                    title="Supprimer"
                    aria-label="Supprimer"
                    disabled={busyId === review.id}
                    onClick={() => void removeReview(review.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {dialog}
    </div>
  );
}
