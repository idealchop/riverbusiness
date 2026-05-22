
import { Metadata } from 'next';
import SolarUpgradesClient from './SolarUpgradesClient';

export const metadata: Metadata = {
  title: 'Upgrades',
};

export default function SolarUpgradesPage() {
  return <SolarUpgradesClient />;
}
