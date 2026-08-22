'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, MessageSquarePlus } from 'lucide-react';
import {
  api,
  getToken,
  type OwnerReview,
  type PublicReview,
} from '@/lib/api';
import { StarRating } from './StarRating';
import './reviews.css';

type ProductReviewsProps = {
  productId: string;
  productSlug: string;
  ratingsAvg?: number | string | null;
  ratingsCount?: number | null;
};

function formatReviewDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('fr-MA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProductReviews({
  productId,
  productSlug,
  ratingsAvg = 0,
  ratingsCount = 0,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [mine, setMine] = useState<OwnerReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const titleId = useId();

  const avg = Number(ratingsAvg ?? 0);
  const count = ratingsCount ?? reviews.length;
  const hasReviews = reviews.length > 0;
  const loginHref = `/connexion?next=${encodeURIComponent(`/produits/${productSlug}`)}`;

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await api<PublicReview[]>(
          `/reviews/product/${productId}`,
          { auth: false },
        );
        if (!cancelled) setReviews(list);
      } catch {
        if (!cancelled) setReviews([]);
      }

      if (getToken()) {
        try {
          const own = await api<OwnerReview[]>('/reviews/mine');
          const match = own.find((r) => r.productId === productId) ?? null;
          if (!cancelled) setMine(match);
        } catch {
          if (!cancelled) setMine(null);
        }
      }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFormOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [formOpen]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!getToken()) {
      window.location.href = loginHref;
      return;
    }

    setSubmitting(true);
    try {
      const created = await api<OwnerReview & { message?: string }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      setMine(created);
      setSuccess(
        created.message ??
          'Votre avis a été envoyé et est en attente de validation',
      );
      setTitle('');
      setComment('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Impossible d’envoyer l’avis';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function openForm(initialRating?: number) {
    if (initialRating) setRating(initialRating);
    setFormOpen(true);
  }

  const writeButton = !mine ? (
    <button type="button" className="product-reviews__write" onClick={() => openForm()}>
      <MessageSquarePlus size={16} aria-hidden />
      Donner votre avis
    </button>
  ) : null;

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-title">
      <div className="product-reviews__head">
        <h2 id="product-reviews-title">Avis clients</h2>
        {hasReviews ? writeButton : null}
      </div>

      {loading ? (
        <p className="product-reviews__muted">Chargement des avis…</p>
      ) : !hasReviews ? (
        <div className="product-reviews__empty">
          <div className="product-reviews__empty-main">
            <StarRating
              value={0}
              size={22}
              interactive={!mine}
              onChange={(value) => openForm(value)}
              label="Noter ce produit"
            />
            <div className="product-reviews__empty-copy">
              <p className="product-reviews__empty-label">
                Aucun avis pour le moment
              </p>
              <p className="product-reviews__empty-invite">
                Soyez le premier à partager votre expérience après réception.
              </p>
            </div>
          </div>
          {writeButton}
        </div>
      ) : (
        <div className="product-reviews__layout">
          <div className="product-reviews__score">
            <strong>{avg.toFixed(1).replace('.', ',')}</strong>
            <StarRating value={avg} size={18} label={`Moyenne ${avg}`} />
            <span>Basé sur {count} avis</span>
          </div>
          <ul className="product-reviews__list">
            {reviews.map((review) => (
              <li key={review.id} className="product-reviews__item">
                <div className="product-reviews__item-top">
                  <StarRating value={review.rating} size={14} />
                  <span className="product-reviews__author">{review.authorName}</span>
                  <time dateTime={review.createdAt}>
                    {formatReviewDate(review.createdAt)}
                  </time>
                </div>
                {review.title ? <h3>{review.title}</h3> : null}
                {review.comment ? <p>{review.comment}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mine ? (
        <div className="product-reviews__pending" role="status">
          {mine.isApproved && mine.isVisible ? (
            <p>
              Vous avez déjà noté ce produit ({mine.rating}/5). Merci pour votre
              retour.
            </p>
          ) : (
            <p>
              Votre avis ({mine.rating}/5) est en attente de validation. Il
              apparaîtra ici après modération.
            </p>
          )}
        </div>
      ) : null}

      {formOpen && !mine ? (
        <div
          className="product-reviews__overlay"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="product-reviews__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-reviews__form-head">
              <div>
                <span>Votre expérience</span>
                <h3 id={titleId}>Donner votre avis</h3>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form className="product-reviews__form" onSubmit={onSubmit}>
              <div className="product-reviews__field">
                <span className="product-reviews__label">Votre note</span>
                <StarRating
                  value={rating}
                  interactive
                  onChange={setRating}
                  size={22}
                  label="Choisir une note"
                />
              </div>
              <label className="product-reviews__field">
                <span className="product-reviews__label">Titre (optionnel)</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Ex. Qualité professionnelle"
                />
              </label>
              <label className="product-reviews__field">
                <span className="product-reviews__label">
                  Commentaire (optionnel)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Partagez votre expérience d’utilisation…"
                />
              </label>
              {error ? <p className="product-reviews__error">{error}</p> : null}
              {success ? (
                <p className="product-reviews__success">{success}</p>
              ) : null}
              <p className="product-reviews__hint">
                <Check size={14} strokeWidth={2.4} aria-hidden />
                {loggedIn ? (
                  <span>
                    Votre avis sera publié après validation par l’équipe.
                  </span>
                ) : (
                  <span>
                    <Link href={loginHref}>Connectez-vous</Link> pour publier
                    votre avis.
                  </span>
                )}
              </p>
              <button
                type="submit"
                className="product-reviews__submit"
                disabled={submitting}
              >
                {submitting ? 'Envoi…' : 'Envoyer mon avis'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
