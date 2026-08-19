import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { api, mediaUrl, type Brand } from '@/lib/api';

async function getBrands() {
  try {
    return await api<Brand[]>('/brands', { auth: false });
  } catch {
    return [];
  }
}

export const metadata = { title: 'Marques' };

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="container section">
      <PageHeader title="Marques" subtitle="Découvrez les marques du catalogue Mdiscover." />
      <div className="universe-grid">
        {brands.map((b) => {
          const logo = mediaUrl(b.logoUrl);
          return (
            <Link key={b.id} href={`/marques/${b.slugFr}`} className="panel" style={{ display: 'grid', gap: '0.75rem' }}>
              <div
                style={{
                  height: 120,
                  borderRadius: '1rem',
                  background: logo
                    ? `center/cover url(${logo})`
                    : 'linear-gradient(160deg, rgba(63,90,58,0.15), rgba(196,165,116,0.25))',
                }}
              />
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{b.name}</h2>
              <p style={{ margin: 0, opacity: 0.7 }}>{b.descriptionFr ?? 'Marque partenaire'}</p>
            </Link>
          );
        })}
      </div>
      {brands.length === 0 ? <p style={{ opacity: 0.7 }}>Aucune marque.</p> : null}
    </div>
  );
}
