'use client';

import { useMemo, useState } from 'react';
import { Package, Truck, Warehouse } from 'lucide-react';
import type { ProductDetail } from './product-types';

type SpecRow = { label: string; value: string };
type AccordionId = 'specs' | 'ship';

function buildSpecs(product: ProductDetail): SpecRow[] {
  const rows: SpecRow[] = [];
  if (product.packaging) rows.push({ label: 'Conditionnement', value: product.packaging });
  if (product.unitsPerCarton != null) {
    rows.push({ label: 'Unités / carton', value: String(product.unitsPerCarton) });
  }
  if (product.volumeMl != null && product.volumeMl !== '') {
    rows.push({ label: 'Volume', value: `${product.volumeMl} ml` });
  }
  if (product.weightKg != null && product.weightKg !== '') {
    rows.push({ label: 'Poids', value: `${product.weightKg} kg` });
  }
  if (product.originCountry) rows.push({ label: 'Origine', value: product.originCountry });
  if (product.brand?.name) rows.push({ label: 'Marque', value: product.brand.name });
  if (product.category?.nameFr) rows.push({ label: 'Catégorie', value: product.category.nameFr });
  return rows;
}

function buildExtras(product: ProductDetail): SpecRow[] {
  const rows: SpecRow[] = [];
  if (product.ingredients?.trim()) {
    rows.push({ label: 'Ingrédients', value: product.ingredients.trim() });
  }
  if (product.allergens?.trim()) {
    rows.push({ label: 'Allergènes', value: product.allergens.trim() });
  }
  if (product.nutritionInfo && Object.keys(product.nutritionInfo).length > 0) {
    const text = Object.entries(product.nutritionInfo)
      .map(([k, v]) => `${k} : ${String(v)}`)
      .join(' · ');
    if (text) rows.push({ label: 'Nutrition', value: text });
  }
  return rows;
}

function SpecGrid({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="pd-chars">
      {rows.map((row) => (
        <div key={row.label} className="pd-chars__row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ShippingLines({
  stockLabel,
  storage,
}: {
  stockLabel: string;
  storage: string | null;
}) {
  return (
    <ul className="pd-ship">
      <li>
        <Package size={16} strokeWidth={1.7} aria-hidden />
        <div>
          <strong>Disponibilité</strong>
          <span>{stockLabel}</span>
        </div>
      </li>
      <li>
        <Truck size={16} strokeWidth={1.7} aria-hidden />
        <div>
          <strong>Livraison</strong>
          <span>Livraison professionnelle selon destination.</span>
        </div>
      </li>
      {storage ? (
        <li>
          <Warehouse size={16} strokeWidth={1.7} aria-hidden />
          <div>
            <strong>Stockage</strong>
            <span>{storage}</span>
          </div>
        </li>
      ) : null}
    </ul>
  );
}

type Props = {
  product: ProductDetail;
};

export function ProductDetailsTabs({ product }: Props) {
  const specs = useMemo(() => buildSpecs(product), [product]);
  const extras = useMemo(() => buildExtras(product), [product]);
  const storage = product.storageConditions?.trim() || null;
  const extrasTitle =
    extras.some((row) => row.label === 'Ingrédients' || row.label === 'Allergènes')
      ? 'Informations alimentaires'
      : 'Informations complémentaires';

  const stockLabel = useMemo(() => {
    if (product.purchaseMode === 'QUOTE') return 'Sur devis';
    if (product.stockQty <= 0) return 'Rupture de stock';
    return 'En stock';
  }, [product.purchaseMode, product.stockQty]);

  const accordionItems = useMemo(() => {
    const items: Array<{ id: AccordionId; label: string }> = [];
    if (specs.length > 0 || extras.length > 0) {
      items.push({ id: 'specs', label: 'Caractéristiques' });
    }
    items.push({ id: 'ship', label: 'Livraison & stockage' });
    return items;
  }, [extras.length, specs.length]);

  const [openMobile, setOpenMobile] = useState<AccordionId | null>(
    accordionItems[0]?.id ?? 'specs',
  );

  function renderAccordionBody(id: AccordionId) {
    switch (id) {
      case 'specs':
        return (
          <div className="pd-tabs__stack">
            {specs.length > 0 ? <SpecGrid rows={specs} /> : null}
            {extras.length > 0 ? <SpecGrid rows={extras} /> : null}
          </div>
        );
      case 'ship':
        return <ShippingLines stockLabel={stockLabel} storage={storage} />;
      default:
        return null;
    }
  }

  return (
    <section className="pd-details" aria-label="Informations produit">
      <div className="pd-details__desktop">
        {specs.length > 0 ? (
          <section className="pd-details__block">
            <h2 className="pd-details__title">Caractéristiques</h2>
            <SpecGrid rows={specs} />
          </section>
        ) : null}

        {extras.length > 0 ? (
          <section className="pd-details__block">
            <h2 className="pd-details__title">{extrasTitle}</h2>
            <SpecGrid rows={extras} />
          </section>
        ) : null}

        <section className="pd-details__block">
          <h2 className="pd-details__title">Livraison & stockage</h2>
          <ShippingLines stockLabel={stockLabel} storage={storage} />
        </section>
      </div>

      <div className="pd-details__mobile">
        {accordionItems.map((item) => {
          const isOpen = openMobile === item.id;
          return (
            <div key={item.id} className={`pd-acc${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="pd-acc__btn"
                aria-expanded={isOpen}
                onClick={() => setOpenMobile(isOpen ? null : item.id)}
              >
                <span>{item.label}</span>
                <span aria-hidden>{isOpen ? '−' : '+'}</span>
              </button>
              <div className="pd-acc__panel">
                <div className="pd-acc__panel-inner">
                  {renderAccordionBody(item.id)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
