import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import '@/styles/auth.css';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à votre espace Discover.',
};

export default function ConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="auth auth--login">
          <div className="auth__panel">
            <div className="auth__panel-inner">Chargement…</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
