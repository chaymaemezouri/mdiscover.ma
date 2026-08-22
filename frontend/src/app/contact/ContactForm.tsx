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
        <span className="contact-form__success-icon" aria-hidden>
          <CheckCircle2 size={28} strokeWidth={2} />
        </span>
        <div>
          <h3>Message reçu</h3>
          <p>
            Merci — notre équipe vous répondra dès que possible à l’adresse
            indiquée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <input type="hidden" name="subject" value={topic} />

      <fieldset className="contact-form__topics">
        <legend>Vous souhaitez nous contacter pour</legend>
        <div className="contact-form__topic-row" role="group">
          {TOPICS.map((item) => (
            <button
              key={item}
              type="button"
              className={`contact-form__topic${topic === item ? ' is-active' : ''}`}
              aria-pressed={topic === item}
              onClick={() => setTopic(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="contact-form__grid">
        <div className="contact-form__field">
          <label htmlFor="ct-name">Nom</label>
          <input id="ct-name" name="name" autoComplete="name" required />
        </div>
        <div className="contact-form__field">
          <label htmlFor="ct-email">Email</label>
          <input
            id="ct-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="contact-form__field">
          <label htmlFor="ct-company">Entreprise</label>
          <input
            id="ct-company"
            name="company"
            autoComplete="organization"
            placeholder="Optionnel"
          />
        </div>
        <div className="contact-form__field">
          <label htmlFor="ct-phone">Téléphone</label>
          <input
            id="ct-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Optionnel"
          />
        </div>
      </div>

      <div className="contact-form__field">
        <label htmlFor="ct-message">Votre demande</label>
        <textarea
          id="ct-message"
          name="message"
          rows={5}
          required
          minLength={10}
          placeholder="Décrivez votre besoin, volumes, délais…"
        />
      </div>

      {error ? (
        <p className="contact-form__hint" role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      ) : null}

      <div className="contact-form__actions">
        <p className="contact-form__hint">
          En envoyant ce formulaire, vous acceptez d’être recontacté par notre
          équipe commerciale.
        </p>
        <button className="contact-form__submit" type="submit" disabled={sending}>
          {sending ? 'Envoi…' : 'Envoyer le message'}
          <ArrowUpRight size={16} aria-hidden />
        </button>
      </div>
    </form>
  );
}
