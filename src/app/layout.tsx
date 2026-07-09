import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Mantenimiento de vehículos',
  description: 'Aplicación privada familiar para mantener vehículos.',
};

export default function LayoutRaiz({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
