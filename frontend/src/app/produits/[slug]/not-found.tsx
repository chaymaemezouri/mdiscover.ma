import Link from 'next/link';
import './product-detail.css';

export default function ProductNotFound() {
  return (
    <div className="pd">
      <div className="pd-shell">
        <div className="pd-empty">
          <h1>Produit introuvable</h1>
          <p>
            Ce produit n’existe pas ou n’est plus disponible dans le catalogue
            DISCOVER.
          </p>
          <Link href="/catalogue" className="pd-btn pd-btn--primary">
            Retour au catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
