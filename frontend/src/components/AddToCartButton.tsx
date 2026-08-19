'use client';

import { useState } from 'react';
import { api, getToken } from '@/lib/api';

export function AddToCartButton({ productId }: { productId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!getToken()) {
      window.location.href = '/connexion?next=/panier';
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setStatus('Ajouté au panier');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn btn-primary" type="button" onClick={add} disabled={loading}>
        {loading ? 'Ajout…' : 'Ajouter au panier'}
      </button>
      {status ? (
        <p style={{ marginTop: '0.75rem', color: 'var(--moss)', fontWeight: 600 }}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
