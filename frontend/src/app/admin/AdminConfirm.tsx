'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';

export type AdminConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = AdminConfirmOptions & {
  resolve: (ok: boolean) => void;
};

export function useAdminConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((options: AdminConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const finish = useCallback((ok: boolean) => {
    setPending((current) => {
      current?.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [pending, finish]);

  const dialog: ReactNode = pending ? (
    <div
      className="ad-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <button
        type="button"
        className="ad-confirm__backdrop"
        aria-label="Fermer"
        onClick={() => finish(false)}
      />
      <div className="ad-confirm__panel">
        <span
          className={`ad-confirm__icon${pending.danger === false ? '' : ' is-danger'}`}
          aria-hidden
        >
          <AlertTriangle size={20} />
        </span>
        <h2 id={titleId}>{pending.title}</h2>
        <p id={descId}>{pending.description}</p>
        <div className="ad-confirm__actions">
          <button
            type="button"
            className="ad-btn ad-btn--ghost"
            onClick={() => finish(false)}
          >
            {pending.cancelLabel ?? 'Annuler'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`ad-btn ${pending.danger === false ? '' : 'ad-btn--danger'}`}
            onClick={() => finish(true)}
          >
            {pending.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
