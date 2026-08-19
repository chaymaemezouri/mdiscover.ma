'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { api, type ProductListItem } from '@/lib/api';

type SearchResponse = {
  items: ProductListItem[];
};

function RechercheContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(term: string) {
    const query = term.trim();
    if (!query) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<SearchResponse>(
        `/search?q=${encodeURIComponent(query)}`,
        { auth: false },
      );
      setItems(res.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche impossible');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get('q') ?? '';
    setQ(fromUrl);
    void runSearch(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function onSearch(e?: FormEvent) {
    e?.preventDefault();
    void runSearch(q);
  }

  return (
    <div className="container" style={{ padding: '2.5rem 0 3rem' }}>
      <h1
        style={{
          fontSize: '2.5rem',
          letterSpacing: '-0.03em',
        }}
      >
        Recherche
      </h1>

      <form
        onSubmit={onSearch}
        style={{
          display: 'flex',
          gap: '0.75rem',
          margin: '1.25rem 0 2rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          className="field"
          style={{ flex: '1 1 240px' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Savon, huile, hygiène…"
        />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? '…' : 'Rechercher'}
        </button>
      </form>

      {error ? <p style={{ color: '#8a2f2f' }}>{error}</p> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<div className="container section">Chargement…</div>}>
      <RechercheContent />
    </Suspense>
  );
}
