import { PageHeader } from '@/components/PageHeader';
import { api, type LegalPage } from '@/lib/api';

const SLUG_TO_TYPE: Record<string, string> = {
  cgv: 'CGV',
  confidentialite: 'PRIVACY',
  livraison: 'SHIPPING',
  retours: 'RETURNS',
  mentions: 'LEGAL',
  cookies: 'COOKIES',
};

const FALLBACK: Record<string, { title: string; body: string }> = {
  cgv: {
    title: 'Conditions générales de vente',
    body: 'Les présentes CGV régissent les ventes réalisées sur mdiscover.ma. Contenu administrable depuis le panel.',
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    body: 'Mdiscover traite vos données conformément à la loi 09-08 et, le cas échéant, au RGPD.',
  },
  livraison: {
    title: 'Politique de livraison',
    body: 'Livraisons nationales et internationales selon zones et transporteurs configurés.',
  },
  retours: {
    title: 'Politique de retour',
    body: 'Les retours sont soumis aux conditions produits (périssables / ouverts exclus selon cas).',
  },
  mentions: {
    title: 'Mentions légales',
    body: 'Mdiscover Impex Food — plateforme e-commerce alimentaire & hygiène.',
  },
  cookies: {
    title: 'Politique de cookies',
    body: 'Ce site utilise des cookies nécessaires au fonctionnement et, éventuellement, des outils analytiques.',
  },
};

async function getLegal(slug: string) {
  const type = SLUG_TO_TYPE[slug];
  if (!type) return null;
  try {
    return await api<LegalPage>(`/legal/type/${type}?locale=FR`, { auth: false });
  } catch {
    return null;
  }
}

export default async function LegalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getLegal(slug);
  const fallback = FALLBACK[slug];

  if (!page && !fallback) {
    return (
      <div className="container section">
        <PageHeader title="Page introuvable" />
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <PageHeader title={page?.titleFr ?? fallback!.title} />
      <div className="panel" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {page?.contentFr ?? fallback!.body}
      </div>
    </div>
  );
}
