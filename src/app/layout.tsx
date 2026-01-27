import type {Metadata} from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: {
    default: 'River Business | Smart Water Management',
    template: '%s | River Business',
  },
  description:
    'River Business is a B2B platform for water refilling businesses and their clients, offering consumption tracking, delivery management, compliance monitoring, and AI-powered predictive usage tools.',
  keywords: [
    'water management',
    'B2B',
    'water delivery',
    'consumption tracking',
    'compliance',
    'sanitation',
    'AI',
    'predictive analytics',
    'River Business',
    'RiverPH',
  ],
  authors: [{ name: 'RiverPH', url: 'https://riverph.com' }],
  openGraph: {
    title: 'River Business | Smart Water Management',
    description: 'A comprehensive platform for managing water consumption, deliveries, and compliance.',
    url: 'https://riverph.com',
    siteName: 'River Business',
    images: [
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a',
        width: 1200,
        height: 630,
        alt: 'River Business Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'River Business | Smart Water Management',
    description: 'Manage water consumption, track deliveries, and ensure compliance with our AI-powered platform.',
    images: ['https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased")}>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
