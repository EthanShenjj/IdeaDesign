import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, Gochi_Hand, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import Header from '@/components/Header';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
});

const gochiHand = Gochi_Hand({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-handwriting',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-label',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Atelier - AI Vision Style Extractor',
  description: 'Extract visual style tokens from any image using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} ${gochiHand.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}>
        <ErrorBoundary>
          <LanguageProvider>
            <Header />
            {children}
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
