import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'KairosMix - Mezclas Personalizadas de Frutos Secos & Snacks',
  description:
    'E-commerce de tienda única para crear y comprar mezclas personalizadas de frutos secos, semillas y snacks con cálculo nutricional exacto y alérgenos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-stone-50 text-stone-900 antialiased">
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
