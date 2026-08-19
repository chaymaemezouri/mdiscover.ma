import type { Metadata, Viewport } from 'next';
import { Inter_Tight, Manrope } from 'next/font/google';
import { AppHeader } from '@/components/AppHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

// next/font auto-héberge les fichiers et applique font-display: swap,
// ce qui évite une requête bloquante vers fonts.googleapis.com
const title = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MDISCOVER — Food & Hygiène',
    template: '%s · MDISCOVER',
  },
  description:
    'MDISCOVER — produits alimentaires et d’hygiène, achat direct et devis professionnels.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0e2a47',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${title.variable} ${body.variable}`}>
      <body className="antialiased">
        <AppProviders>
          <AppHeader />
          <main>{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
