'use client';

import { Button } from '@/components/ui/button';
import { BellRing, ShieldCheck } from 'lucide-react';

interface DashboardHeaderProps {
  greeting: string;
  userName?: string;
  isRefillRequesting: boolean;
  onRefillRequest: () => void;
  onComplianceClick: () => void;
  hasPendingRefill: boolean;
}

export function DashboardHeader({
  greeting,
  userName,
  isRefillRequesting,
  onRefillRequest,
  onComplianceClick,
  hasPendingRefill,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {greeting}, {userName}. Here is an overview of your water consumption.
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        <Button
          variant="default"
          className="w-auto h-auto px-4 py-2"
          disabled={isRefillRequesting}
          onClick={onRefillRequest}
        >
          <BellRing className="mr-2 h-4 w-4" />
          {hasPendingRefill ? 'Check Request Status' : 'Request Refill'}
        </Button>
        <Button
          variant="default"
          className="w-auto h-auto px-4 py-2"
          onClick={onComplianceClick}
        >
          <ShieldCheck className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Compliance &amp; Sanitation</span>
        </Button>
      </div>
    </div>
  );
}
