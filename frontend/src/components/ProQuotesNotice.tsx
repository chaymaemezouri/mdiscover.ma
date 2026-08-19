'use client';

import Link from 'next/link';
import '@/app/commande/commande.css';

export function ProQuotesNotice() {
  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <section className="checkout-state">
          <h2>Espace professionnel</h2>
          <p>
            Les demandes de devis sont réservées aux comptes professionnels.
            Avec un compte particulier, vous pouvez commander directement depuis
            le catalogue.
          </p>
          <div className="checkout-success__actions">
            <Link href="/compte" className="checkout-cta checkout-success__cta">
              Mon compte
            </Link>
            <Link href="/catalogue" className="checkout-success__link">
              Voir le catalogue
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
