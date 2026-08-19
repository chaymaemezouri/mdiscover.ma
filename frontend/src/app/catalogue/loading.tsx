import './catalogue.css';

export default function CatalogueLoading() {
  return (
    <div className="catalogue">
      <div className="catalogue__inner">
        <header className="catalogue__header">
          <nav className="catalogue__crumbs" aria-label="Fil d’Ariane">
            <span>Accueil</span>
            <span aria-hidden>/</span>
            <span aria-current="page">Catalogue</span>
          </nav>
        </header>
        <div className="catalogue__skel-line" aria-hidden />
        <div
          className="catalogue__skel-grid"
          aria-busy="true"
          aria-label="Chargement du catalogue"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="catalogue__skel-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
