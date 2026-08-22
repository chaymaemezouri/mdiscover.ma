import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from './ContactForm';
import {
  CONTACT_ADDRESS_FULL,
  CONTACT_EMAIL,
  CONTACT_HOURS,
} from '@/lib/contact';
import { TOP_BAR_PHONE } from '@/lib/home-nav';
import './contact.css';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contactez MDiscover Impex Food pour un devis, un sourcing ou une question commerciale. Réponse sous 24 h ouvrées.',
};

export default function ContactPage() {
  const telHref = `tel:${TOP_BAR_PHONE.replace(/[\s.-]/g, '')}`;

  return (
    <main className="contact-page">
      <div className="contact-shell">
        <div className="contact-grid">
          <header className="contact-intro">
            <p className="contact-intro__brand">MDiscover</p>
            <h1 className="contact-intro__title">Contact</h1>
            <p className="contact-intro__lead">
              Une question ou un besoin professionnel&nbsp;? Écrivez-nous —
              réponse sous 24&nbsp;h ouvrées.
            </p>

            <ul className="contact-details" aria-label="Coordonnées">
              <li>
                <span>Email</span>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
              <li>
                <span>Téléphone</span>
                <a href={telHref}>{TOP_BAR_PHONE}</a>
              </li>
              <li>
                <span>Horaires</span>
                <p>{CONTACT_HOURS}</p>
              </li>
              <li>
                <span>Adresse</span>
                <p>{CONTACT_ADDRESS_FULL}</p>
              </li>
            </ul>

            <p className="contact-intro__links">
              <Link href="/devis">Demander un devis</Link>
              <span aria-hidden>·</span>
              <Link href="/faq">FAQ</Link>
            </p>
          </header>

          <section
            className="contact-form-block"
            aria-labelledby="contact-form-title"
          >
            <h2 id="contact-form-title" className="contact-form-block__title">
              Votre message
            </h2>
            <ContactForm />
          </section>
        </div>
      </div>
    </main>
  );
}
