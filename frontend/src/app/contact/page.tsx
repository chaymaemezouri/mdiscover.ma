import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock3,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { ContactForm } from './ContactForm';
import {
  CONTACT_ADDRESS_LINES,
  CONTACT_CITY,
  CONTACT_EMAIL,
  CONTACT_HOURS,
} from '@/lib/contact';
import { TOP_BAR_PHONE } from '@/lib/home-nav';
import './contact.css';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Une question, un projet professionnel, un besoin de sourcing ou d’export ? Notre équipe est là pour vous accompagner.',
};

export default function ContactPage() {
  const telHref = `tel:${TOP_BAR_PHONE.replace(/[\s.-]/g, '')}`;

  return (
    <main className="contact-page">
      <div className="contact-shell">
        <nav className="contact-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Contact</span>
        </nav>

        <header className="contact-head">
          <p className="contact-head__kicker">Contact · Discover</p>
          <h1>Parlons de votre prochain besoin</h1>
          <p className="contact-head__lead">
            Une question, un projet professionnel, un besoin de sourcing ou
            d’export&nbsp;? Notre équipe vous répond sous 24&nbsp;h ouvrées.
          </p>
        </header>

        <div className="contact-layout">
          <aside className="contact-aside" aria-label="Coordonnées">
            <div className="contact-aside__cards">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="contact-info-card contact-info-card--link"
              >
                <span className="contact-info-card__icon" aria-hidden>
                  <Mail size={18} strokeWidth={2} />
                </span>
                <span className="contact-info-card__body">
                  <strong>Email</strong>
                  <span>{CONTACT_EMAIL}</span>
                </span>
              </a>

              <a href={telHref} className="contact-info-card contact-info-card--link">
                <span className="contact-info-card__icon" aria-hidden>
                  <Phone size={18} strokeWidth={2} />
                </span>
                <span className="contact-info-card__body">
                  <strong>Téléphone</strong>
                  <span>{TOP_BAR_PHONE}</span>
                </span>
              </a>

              <div className="contact-info-card">
                <span className="contact-info-card__icon" aria-hidden>
                  <Clock3 size={18} strokeWidth={2} />
                </span>
                <span className="contact-info-card__body">
                  <strong>Horaires</strong>
                  <span>{CONTACT_HOURS}</span>
                </span>
              </div>

              <div className="contact-info-card">
                <span className="contact-info-card__icon" aria-hidden>
                  <MapPin size={18} strokeWidth={2} />
                </span>
                <span className="contact-info-card__body">
                  <strong>Localisation</strong>
                  <span>
                    {CONTACT_ADDRESS_LINES[0]}
                    <br />
                    {CONTACT_CITY}, Maroc
                  </span>
                </span>
              </div>
            </div>

            <div className="contact-aside__links">
              <p className="contact-aside__links-title">Besoin d’aller plus loin&nbsp;?</p>
              <Link href="/devis" className="contact-quick-link">
                <FileText size={16} aria-hidden />
                Demander un devis pro
              </Link>
              <Link href="/faq" className="contact-quick-link">
                <HelpCircle size={16} aria-hidden />
                Consulter la FAQ
              </Link>
            </div>
          </aside>

          <section
            className="contact-panel"
            aria-labelledby="contact-form-title"
          >
            <div className="contact-panel__head">
              <h2 id="contact-form-title">Envoyer un message</h2>
              <p>
                Décrivez votre besoin — nous vous orienterons vers la bonne
                équipe.
              </p>
            </div>
            <ContactForm />
          </section>
        </div>
      </div>
    </main>
  );
}
