import type { Metadata } from 'next';
import { Suspense } from 'react';
import RegisterForm from './RegisterForm';
import '@/styles/auth.css';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    'Créez votre compte Discover — particulier ou professionnel — pour commander et demander vos devis.',
};

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <main className="auth auth--register">
          <div className="auth__panel">
            <div className="auth__panel-inner">Chargement…</div>
          </div>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
