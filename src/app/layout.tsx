import type {Metadata} from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: {
    default: 'River Business | The All-in-One Business Operating System',
    template: '%s | River Business',
  },
  description:
    'The platform to run essential needs for business workforce. River Business is a unified ecosystem connecting operations, people, collaboration, and security in one modular SaaS platform.',
  keywords: [
    'business operating system',
    'workforce management',
    'HR software',
    'operations management',
    'water refill business',
    'collaboration workspace',
    'secure file sharing',
    'corporate security',
    'River Apps',
    'Philippines SaaS',
  ],
  authors: [{ name: 'RiverPH', url: 'https://riverph.com' }],
  openGraph: {
    title: 'River Business | All-in-One Operating System for Modern Teams',
    description: 'The platform to run essential needs for business workforce. Manage operations, people, and data in one intelligent ecosystem.',
    url: 'https://riverph.com',
    siteName: 'River Business',
    images: [
      {
        url: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Flanding%20page%20image.png?alt=media&token=4b8d98bc-e6e8-4710-b10e-e84e75839c7a',
        width: 1200,
        height: 630,
        alt: 'River Business Platform - Workforce & Operations OS',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'River Business | The platform to run essential needs for business workforce',
    description: 'Streamline your business operations with our unified SaaS platform. From HR to logistics, everything runs in one place.',
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
