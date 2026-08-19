'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ABOUT_FAQ } from '@/lib/about-content';

export function AboutFaq() {
  const [openId, setOpenId] = useState<string | null>(ABOUT_FAQ[0]?.id ?? null);

  return (
    <div className="about-faq__list">
      {ABOUT_FAQ.map((item, index) => {
        const isOpen = openId === item.id;
        return (
          <article
            key={item.id}
            className={`about-faq__item${isOpen ? ' is-open' : ''}`}
          >
            <button
              type="button"
              className="about-faq__trigger"
              aria-expanded={isOpen}
              aria-controls={`about-faq-panel-${item.id}`}
              id={`about-faq-trigger-${item.id}`}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span className="about-faq__index">{index + 1}</span>
              <span className="about-faq__question">{item.question}</span>
              <ChevronDown size={18} aria-hidden className="about-faq__chevron" />
            </button>
            <div
              id={`about-faq-panel-${item.id}`}
              role="region"
              aria-labelledby={`about-faq-trigger-${item.id}`}
              className="about-faq__panel"
              hidden={!isOpen}
            >
              <p>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
