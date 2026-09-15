
import { Metadata } from 'next';
import SolarUpgradesClient from './SolarUpgradesClient';
import { inAppTitle, privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: inAppTitle('Upgrades'),
  robots: privatePageRobots,
};

export default function SolarUpgradesPage() {
  return <SolarUpgradesClient />;
}
