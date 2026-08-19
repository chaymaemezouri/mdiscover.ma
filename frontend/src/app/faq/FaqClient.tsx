'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { QuoteGate } from '@/components/QuoteGate';
import {
  FAQ_CATEGORIES,
  FAQ_INTRO,
  FAQ_ITEMS,
  FAQ_TRUST_STATS,
  type FaqCategoryId,
  type FaqLink,
} from '@/lib/faq-content';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function categoryLabel(categoryId: Exclude<FaqCategoryId, 'all'>) {
  return FAQ_CATEGORIES.find((c) => c.id === categoryId)?.label ?? '';
}

function FaqInlineLinks({ links }: { links: FaqLink[] }) {
  if (!links.length) return null;

  return (
    <p className="faq-item__links">
      {links.map((link) => {
        const node = (
          <Link href={link.href} className="faq-item__link">
            {link.label}
            <ArrowUpRight size={14} aria-hidden />
          </Link>
        );

        return link.proOnly ? (
          <QuoteGate key={link.href + link.label}>{node}</QuoteGate>
        ) : (
          <span key={link.href + link.label}>{node}</span>
        );
      })}
    </p>
  );
}

export function FaqClient() {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategoryId>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());

    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        category === 'all' || item.category === category;

      if (!matchesCategory) return false;
      if (!q) return true;

      const haystack = normalize(
        `${item.question} ${item.answer} ${categoryLabel(item.category)}`,
      );
      return haystack.includes(q);
    });
  }, [query, category]);

  const toggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  const handleCategory = useCallback((id: FaqCategoryId) => {
    setCategory(id);
    setOpenId(null);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setOpenId(null);
  }, []);

  return (
    <>
      <div className="faq-toolbar">
        <label className="faq-search" htmlFor={searchId}>
          <span className="faq-sr-only">Rechercher une question</span>
          <Search size={18} aria-hidden className="faq-search__icon" />
          <input
            id={searchId}
            type="search"
            className="faq-search__input"
            placeholder="Rechercher une question, un sujet…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <div className="faq-trust" aria-label="Points clés">
          {FAQ_TRUST_STATS.map((stat, index) => (
            <div key={stat.value} className="faq-trust__item">
              {index > 0 ? (
                <span className="faq-trust__sep" aria-hidden />
              ) : null}
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="faq-intro" aria-labelledby="faq-intro-title">
        <p className="faq-intro__kicker" id="faq-intro-title">
          Qui sommes-nous
        </p>
        <p>{FAQ_INTRO}</p>
        <Link href="/a-propos" className="faq-intro__link">
          En savoir plus sur MDISCOVER
          <ArrowUpRight size={15} aria-hidden />
        </Link>
      </section>

      <div
        className="faq-chips"
        role="tablist"
        aria-label="Filtrer par catégorie"
      >
        {FAQ_CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`faq-chip${active ? ' is-active' : ''}`}
              onClick={() => handleCategory(cat.id)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <section className="faq-list-section" aria-labelledby="faq-list-title">
        <h2 id="faq-list-title" className="faq-list-section__title">
          Questions fréquentes
        </h2>

        {filtered.length === 0 ? (
          <div className="faq-empty" role="status">
            <strong>Aucun résultat</strong>
            <p>Essayez un autre terme ou contactez notre équipe.</p>
            <Link href="/contact" className="faq-empty__cta">
              Contacter MDISCOVER
            </Link>
          </div>
        ) : (
          <div className="faq-list">
            {filtered.map((item, index) => {
              const isOpen = openId === item.id;
              const displayIndex = String(index + 1).padStart(2, '0');
              const panelId = `faq-panel-${item.id}`;
              const triggerId = `faq-trigger-${item.id}`;

              return (
                <article
                  key={item.id}
                  className={`faq-item${isOpen ? ' is-open' : ''}`}
                >
                  <h3 className="faq-item__heading">
                    <button
                      type="button"
                      id={triggerId}
                      className="faq-item__trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(item.id)}
                    >
                      <span className="faq-item__num">{displayIndex}</span>
                      <span className="faq-item__question">
                        {item.question}
                      </span>
                      <span className="faq-item__toggle" aria-hidden>
                        {isOpen ? '−' : '+'}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    className="faq-item__panel"
                    hidden={!isOpen}
                  >
                    <div className="faq-item__panel-inner">
                      <p>{item.answer}</p>
                      {item.links ? (
                        <FaqInlineLinks links={item.links} />
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
