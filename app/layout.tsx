import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'NASCAR Trail Racer 500',
  description: 'High-octane 3D NASCAR trail racing game with 99 cars, a 99-stall pit road featuring tire changers and spark plug inspection, canyon bridges, custom liveries, physics tuning, and immersive HUD telemetry.',
  openGraph: {
    title: 'NASCAR Trail Racer 500',
    description: 'High-octane 3D NASCAR trail racing game with 99 cars, a 99-stall pit road featuring tire changers and spark plug inspection, canyon bridges, custom liveries, physics tuning, and immersive HUD telemetry.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NASCAR Trail Racer 500',
    description: 'High-octane 3D NASCAR trail racing game with 99 cars, a 99-stall pit road featuring tire changers and spark plug inspection, canyon bridges, custom liveries, physics tuning, and immersive HUD telemetry.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
