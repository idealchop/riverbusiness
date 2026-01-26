
'use client';

import { Button } from '@/components/ui/button';
import { BellRing, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  greeting: string;
  userName?: string;
  isRefillRequesting: boolean;
  onRefillRequest: () => void;
  onComplianceClick: () => void;
  hasPendingRefill: boolean;
  onPartnerNoticeClick: () => void;
  stationStatus?: 'Operational' | 'Under Maintenance';
}

export function DashboardHeader({
  greeting,
  userName,
  isRefillRequesting,
  onRefillRequest,
  onComplianceClick,
  hasPendingRefill,
  onPartnerNoticeClick,
  stationStatus,
}: DashboardHeaderProps) {
  const isMaintenance = stationStatus === 'Under Maintenance';

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
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
          {hasPendingRefill ? 'View Status' : 'Request Refill'}
        </Button>
        <Button
          variant="default"
          className="w-auto h-auto px-4 py-2"
          onClick={onComplianceClick}
        >
          <ShieldCheck className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Compliance &amp; Sanitation</span>
        </Button>
        <Button
          variant={isMaintenance ? 'secondary' : 'default'}
          size="icon"
          onClick={onPartnerNoticeClick}
          className={cn(
            isMaintenance && 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 animate-pulse'
          )}
        >
            <AlertTriangle className="h-4 w-4" />
            <span className="sr-only">Partner Station Notice</span>
        </Button>
      </div>
    </div>
  );
}
