'use client';

type Props = {
  loading?: boolean;
  onClick: () => void;
};

export function GoogleAuthButton({ loading = false, onClick }: Props) {
  return (
    <button
      type="button"
      className="auth__social-button"
      disabled={loading}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden>
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.24-.2-1.79H12v3.4h5.52a4.72 4.72 0 0 1-2.05 3.09l-.02.11 2.98 2.31.21.02c1.94-1.79 2.96-4.43 2.96-7.14"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.96-.89 6.64-2.63l-3.17-2.44c-.85.57-1.99.97-3.47.97a6.03 6.03 0 0 1-5.7-4.17l-.11.01-3.1 2.4-.04.1A10 10 0 0 0 12 22"
        />
        <path
          fill="#FBBC05"
          d="M6.3 13.73A6.17 6.17 0 0 1 5.97 12c0-.6.11-1.18.32-1.73v-.12L3.16 7.72l-.1.05A10 10 0 0 0 2 12c0 1.52.35 2.96 1.05 4.23l3.25-2.5"
        />
        <path
          fill="#EA4335"
          d="M12 6.1c1.88 0 3.15.81 3.88 1.48l2.82-2.75A9.56 9.56 0 0 0 12 2a10 10 0 0 0-8.95 5.77l3.24 2.5A6.05 6.05 0 0 1 12 6.1"
        />
      </svg>
      {loading ? 'Connexion avec Google…' : 'Continuer avec Google'}
    </button>
  );
}
