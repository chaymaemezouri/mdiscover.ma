import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { HomeOffersSection } from '@/components/home/HomeOffersSection';
import { QuoteGate } from '@/components/QuoteGate';
import {
  ABOUT_HERO,
  ABOUT_MARKETS,
  ABOUT_RESOURCES,
  ABOUT_SERVICES,
  ABOUT_WHO,
} from '@/lib/about-content';
import {
  CONTACT_ADDRESS_FULL,
  CONTACT_EMAIL,
} from '@/lib/contact';
import { TOP_BAR_PHONE } from '@/lib/home-nav';
import { api, type Category, type ProductsResponse } from '@/lib/api';
import { buildCategoryDisplaysWithFallback } from '@/lib/category-display';
import { catalogueCategoryHref } from '@/lib/home-categories';
import { AboutFaq } from './AboutFaq';
import './about.css';

export const metadata: Metadata = {
  title: 'À propos',
  description:
    'MDISCOVER IMPEX FOOD — import-export agroalimentaire, sourcing B2B et produits du terroir marocain pour le Maroc, l’Afrique et le Moyen-Orient.',
};

async function getBestSellers() {
  const empty: ProductsResponse = {
    items: [],
    meta: { total: 0, page: 1, limit: 8, pages: 0 },
  };
  try {
    return await api<ProductsResponse>(
      '/products?sort=best_sellers&limit=8',
      { auth: false },
    );
  } catch {
    return empty;
  }
}

async function getCategories() {
  try {
    return await api<Category[]>('/categories', { auth: false });
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const [bestSellers, apiCategories] = await Promise.all([
    getBestSellers(),
    getCategories(),
  ]);
  const telHref = `tel:${TOP_BAR_PHONE.replace(/[\s.-]/g, '')}`;
  const categories = buildCategoryDisplaysWithFallback(apiCategories).slice(0, 8);

  return (
    <main className="about-page">
      <div className="about-zone about-zone--hero">
        <div className="about-shell">
          <nav className="about-crumbs" aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden>/</span>
            <span aria-current="page">À propos</span>
          </nav>

          <header className="about-intro">
            <div className="about-intro__panel">
              <div className="about-intro__copy">
                <p className="about-intro__kicker">{ABOUT_HERO.eyebrow}</p>
                <h1>{ABOUT_HERO.title}</h1>
                <p className="about-intro__lead">{ABOUT_HERO.lead}</p>
                <p className="about-intro__sub">{ABOUT_HERO.sub}</p>
                <div className="about-intro__actions">
                  <Link href="/contact" className="about-btn about-btn--primary">
                    Nous contacter
                    <ArrowUpRight size={16} aria-hidden />
                  </Link>
                  <a href="#services" className="about-btn about-btn--outline">
                    Nos services
                  </a>
                </div>
              </div>

              <div className="about-intro__visual">
                <div className="about-intro__frame about-intro__frame--main">
                  <Image
                    src="/images/sourcing-left.jpeg"
                    alt="Produits agroalimentaires sélectionnés pour le commerce B2B"
                    fill
                    sizes="(min-width: 900px) 420px, 88vw"
                    className="about-intro__img"
                    priority
                  />
                </div>
                <div className="about-intro__frame about-intro__frame--accent">
                  <Image
                    src="/images/sourcing-right.jpeg"
                    alt="Sourcing agroalimentaire professionnel"
                    fill
                    sizes="(min-width: 900px) 200px, 42vw"
                    className="about-intro__img"
                  />
                </div>
                <div className="about-intro__badge">
                  <strong>15+</strong>
                  <span>ans d’expérience</span>
                </div>
              </div>
            </div>
          </header>
        </div>

        <div className="about-ticker" aria-hidden>
          <div className="about-ticker__track">
            {[0, 1].map((group) => (
              <div key={group} className="about-ticker__group">
                {ABOUT_MARKETS.map((label) => (
                  <span key={`${group}-${label}`} className="about-ticker__item">
                    {label}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="about-zone about-zone--cream" id="services">
        <div className="about-shell">
          <section aria-labelledby="about-services-title">
            <div className="about-section-head">
              <p className="about-section-head__kicker">Services</p>
              <h2 id="about-services-title">Ce que nous proposons</h2>
              <p>
                Du négoce alimentaire à la logistique internationale — un
                accompagnement structuré pour vos flux B2B.
              </p>
            </div>
            <div className="about-services">
              {ABOUT_SERVICES.map((service) => (
                <article key={service.num} className="about-service-card">
                  <span className="about-service-card__num">{service.num}</span>
                  <strong>{service.title}</strong>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--navy">
        <div className="about-shell">
          <section className="about-who" aria-labelledby="about-who-title">
            <div className="about-who__copy">
              <p className="about-who__kicker">{ABOUT_WHO.kicker}</p>
              <h2 id="about-who-title">{ABOUT_WHO.title}</h2>
              <p>{ABOUT_WHO.body}</p>
              <div className="about-who__stat">
                <span className="about-who__stat-value">{ABOUT_WHO.statValue}</span>
                <span className="about-who__stat-label">{ABOUT_WHO.statLabel}</span>
              </div>
            </div>
            <div className="about-who__visual">
              <Image
                src="/categories/fruits-legumes.png"
                alt="Fruits et légumes — produits agroalimentaires MDISCOVER"
                fill
                sizes="(min-width: 900px) 480px, 88vw"
                className="about-who__img"
              />
            </div>
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--white">
        <div className="about-shell">
          <section className="about-offers" aria-labelledby="about-bestsellers-title">
            <HomeOffersSection
              title="Meilleures ventes"
              description="Les références les plus demandées par nos clients professionnels."
              href="/catalogue?sort=best_sellers"
              linkLabel="Voir tout le catalogue"
              items={bestSellers.items}
              emptyMessage="Les meilleures ventes seront bientôt disponibles."
              titleId="about-bestsellers-title"
              markFirstAsFeatured
              eyebrow="Best sellers"
            />
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--mesh">
        <div className="about-shell">
          <section aria-labelledby="about-categories-title">
            <div className="about-section-head about-section-head--row">
              <div>
                <p className="about-section-head__kicker">Catégories</p>
                <h2 id="about-categories-title">Ce dont nos clients ont besoin</h2>
              </div>
              <Link href="/categories" className="about-text-link">
                Toutes les catégories
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="about-categories">
              {categories.map((cat, index) => (
                <Link
                  key={cat.slugFr}
                  href={catalogueCategoryHref(cat.slugFr)}
                  className={`about-cat-card${index === 0 ? ' about-cat-card--featured' : ''}`}
                >
                  <div className="about-cat-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.imageUrl} alt={cat.imageAlt} loading="lazy" />
                  </div>
                  <div className="about-cat-card__body">
                    <h3>
                      {cat.nameFr}
                      <ArrowUpRight size={14} aria-hidden />
                    </h3>
                    <p>{cat.descriptionFr}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--white" id="faq">
        <div className="about-shell">
          <section className="about-faq-section" aria-labelledby="about-faq-title">
            <div className="about-faq-section__intro">
              <p className="about-section-head__kicker">FAQ</p>
              <h2 id="about-faq-title">Des questions ? Nous avons les réponses.</h2>
              <p>
                Tout ce qu’il faut savoir sur nos solutions agroalimentaires et
                notre accompagnement B2B.
              </p>
              <Link href="/faq" className="about-btn about-btn--primary about-btn--compact">
                Voir toute la FAQ
                <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="about-faq">
              <AboutFaq />
            </div>
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--green">
        <div className="about-shell">
          <section className="about-resources" aria-labelledby="about-resources-title">
            <div>
              <h2 id="about-resources-title">{ABOUT_RESOURCES.title}</h2>
              <p>{ABOUT_RESOURCES.lead}</p>
              <p>{ABOUT_RESOURCES.commitment}</p>
            </div>
            <Link href="/faq" className="about-btn about-btn--light">
              Consulter la FAQ
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          </section>
        </div>
      </div>

      <div className="about-zone about-zone--contact">
        <div className="about-shell">
          <section className="about-contact" aria-label="Coordonnées MDISCOVER">
            <div className="about-contact__main">
              <strong>MDISCOVER IMPEX FOOD</strong>
              <p>
                Sourcing fiable, commerce international et accompagnement de
                proximité pour vos projets agroalimentaires.
              </p>
              <div className="about-contact__actions">
                <Link href="/contact" className="about-btn about-btn--light">
                  Demander un contact
                  <ArrowUpRight size={16} aria-hidden />
                </Link>
                <QuoteGate>
                  <Link href="/devis" className="about-btn about-btn--ghost-light">
                    Demander un devis
                  </Link>
                </QuoteGate>
              </div>
            </div>
            <div className="about-contact__details">
              <a href={telHref}>
                <Phone size={16} aria-hidden />
                {TOP_BAR_PHONE}
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail size={16} aria-hidden />
                {CONTACT_EMAIL}
              </a>
              <span>
                <MapPin size={16} aria-hidden />
                {CONTACT_ADDRESS_FULL}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
