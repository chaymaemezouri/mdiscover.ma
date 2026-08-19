import './product-detail.css';

export default function ProductLoading() {
  return (
    <div className="pd" aria-busy="true" aria-live="polite">
      <div className="pd-shell">
        <div className="pd-skel__block pd-skel__crumbs" />
        <div className="pd-skel">
          <div className="pd-skel__block pd-skel__gallery" />
          <div className="pd-skel__info">
            <div className="pd-skel__block pd-skel__eyebrow" />
            <div className="pd-skel__block pd-skel__title" />
            <div className="pd-skel__block pd-skel__meta" />
            <div className="pd-skel__block pd-skel__price" />
            <div className="pd-skel__block pd-skel__chip" />
            <div className="pd-skel__block pd-skel__qty" />
            <div className="pd-skel__block pd-skel__cta" />
          </div>
        </div>
        <div className="pd-skel__details">
          <div className="pd-skel__block pd-skel__details-title" />
          <div className="pd-skel__details-grid">
            <div className="pd-skel__block pd-skel__copy" />
            <div className="pd-skel__block pd-skel__rows" />
          </div>
        </div>
        <span className="sr-only">Chargement de la fiche produit…</span>
      </div>
    </div>
  );
}
