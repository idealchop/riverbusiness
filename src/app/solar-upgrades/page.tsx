
import { Metadata } from 'next';
import SolarUpgradesClient from './SolarUpgradesClient';
import { privatePageRobots } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Upgrades',
  robots: privatePageRobots,
};

export default function SolarUpgradesPage() {
  return <SolarUpgradesClient />;
}
