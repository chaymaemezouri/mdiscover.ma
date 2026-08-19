import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { QuoteGate } from '@/components/QuoteGate';
import {
  CONTACT_ADDRESS_FULL,
  CONTACT_EMAIL,
} from '@/lib/contact';
import { FAQ_ITEMS } from '@/lib/faq-content';
import { TOP_BAR_PHONE } from '@/lib/home-nav';
import { FaqClient } from './FaqClient';
import './faq.css';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Réponses sur les produits agroalimentaires MDISCOVER, l’approvisionnement B2B, le sourcing et les opérations d’import-export.',
};

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export default function FaqPage() {
  const telHref = `tel:${TOP_BAR_PHONE.replace(/[\s.-]/g, '')}`;

  return (
    <main className="faq-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />

      <div className="faq-shell">
        <nav className="faq-crumbs" aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">FAQ</span>
        </nav>

        <header className="faq-hero">
          <p className="faq-hero__kicker">FAQ · MDISCOVER</p>
          <h1>
            Des questions ?
            <br />
            Nous avons les{' '}
            <span className="faq-hero__accent">réponses</span>.
          </h1>
          <p className="faq-hero__lead">
            Tout ce qu’il faut savoir sur nos produits, l’approvisionnement B2B,
            le sourcing et nos opérations d’import-export.
          </p>
        </header>

        <FaqClient />

        <section className="faq-cta" aria-labelledby="faq-cta-title">
          <p className="faq-cta__kicker">
            Vous n&apos;avez pas trouvé votre réponse ?
          </p>
          <h2 id="faq-cta-title">Parlons de votre besoin.</h2>
          <p className="faq-cta__lead">
            Notre équipe peut vous accompagner pour une commande, un devis, un
            sourcing ou une opération d&apos;import-export.
          </p>
          <div className="faq-cta__actions">
            <Link href="/contact" className="faq-cta__primary">
              Contacter notre équipe
            </Link>
            <QuoteGate>
              <Link href="/devis" className="faq-cta__secondary">
                Demander un devis
                <ArrowUpRight size={15} aria-hidden />
              </Link>
            </QuoteGate>
          </div>
          <div className="faq-cta__contact">
            <a href={telHref} className="faq-cta__contact-link">
              {TOP_BAR_PHONE}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="faq-cta__contact-link">
              {CONTACT_EMAIL}
            </a>
            <span className="faq-cta__contact-address">{CONTACT_ADDRESS_FULL}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
