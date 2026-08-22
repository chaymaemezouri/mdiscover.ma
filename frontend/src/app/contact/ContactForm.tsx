'use client';

import { useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

const TOPICS = [
  'Demande générale',
  'Devis professionnel',
  'Sourcing',
  'Export',
  'Commande',
] as const;

export function ContactForm() {
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(TOPICS[0]);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;

    const form = e.currentTarget;
    const data = new FormData(form);

    setSending(true);
    setError(null);
    try {
      await api('/contact', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          topic,
          name: String(data.get('name') ?? '').trim(),
          email: String(data.get('email') ?? '').trim(),
          company: String(data.get('company') ?? '').trim() || undefined,
          phone: String(data.get('phone') ?? '').trim() || undefined,
          message: String(data.get('message') ?? '').trim(),
        }),
      });
      setSent(true);
      form.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Envoi impossible. Réessayez dans un instant.',
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-form__success" role="status">
        <CheckCircle2 size={22} strokeWidth={2} aria-hidden />
        <div>
          <h3>Message envoyé</h3>
          <p>Nous vous répondrons à l’adresse indiquée sous 24&nbsp;h ouvrées.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <label className="contact-form__field">
        <span>Sujet</span>
        <select
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as (typeof TOPICS)[number])}
        >
          {TOPICS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="contact-form__row">
        <label className="contact-form__field">
          <span>Nom</span>
          <input name="name" autoComplete="name" required />
        </label>
        <label className="contact-form__field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      </div>

      <div className="contact-form__row">
        <label className="contact-form__field">
          <span>
            Entreprise <em>optionnel</em>
          </span>
          <input name="company" autoComplete="organization" />
        </label>
        <label className="contact-form__field">
          <span>
            Téléphone <em>optionnel</em>
          </span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
      </div>

      <label className="contact-form__field">
        <span>Message</span>
        <textarea
          name="message"
          rows={5}
          required
          minLength={10}
          placeholder="Volumes, délais, produits concernés…"
        />
      </label>

      {error ? (
        <p className="contact-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="contact-form__footer">
        <button className="contact-form__submit" type="submit" disabled={sending}>
          {sending ? 'Envoi…' : 'Envoyer'}
          <ArrowUpRight size={16} aria-hidden />
        </button>
      </div>
    </form>
  );
}
