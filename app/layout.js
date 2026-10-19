import './globals.css';
import './faq-publico.css';
import './faq-panel.css';
import { ThemeProvider } from '../lib/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import RecuperadorDeChunks from '../components/RecuperadorDeChunks';
import { DialogosProvider } from '../components/Dialogos';
import TablasEnTarjetas from '../components/TablasEnTarjetas';
import TonosContenedores from '../components/TonosContenedores';
import InstalarSesion from '../components/InstalarSesion';
import CambioPasswordGlobal from '../components/CambioPasswordGlobal';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://faq-ilce.vercel.app'),
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png?v=2'
  },
  title: 'Preguntas frecuentes | Instituto ILCE',
  description: 'Respuestas a las preguntas más frecuentes sobre el Instituto ILCE: campus, cursada, certificaciones, pagos y comunidad.',
  openGraph: { type: 'website', locale: 'es_AR', siteName: 'Instituto ILCE', title: 'Preguntas frecuentes | Instituto ILCE', description: 'Todo lo que necesitás saber sobre el Instituto ILCE.', url: '/', images: [{ url: '/og-image.png?v=1', width: 1200, height: 630, alt: 'Instituto ILCE' }] },
  twitter: { card: 'summary_large_image', title: 'Preguntas frecuentes | Instituto ILCE', images: ['/og-image.png?v=1'] }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <DialogosProvider>
            <RecuperadorDeChunks />
            <InstalarSesion />
            <CambioPasswordGlobal />
            <TablasEnTarjetas />
            <TonosContenedores />
            <ErrorBoundary>{children}</ErrorBoundary>
          </DialogosProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
