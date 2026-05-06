
'use client';

import { Button } from '@/components/ui/button';
import { BellRing, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardHeaderProps {
  greeting: string;
  userName?: string;
  onRefillRequest: () => void;
  onComplianceClick: () => void;
  hasPendingRefill: boolean;
  onPartnerNoticeClick: () => void;
  stationStatus?: 'Operational' | 'Under Maintenance';
}

export function DashboardHeader({
  greeting,
  userName,
  onRefillRequest,
  onComplianceClick,
  hasPendingRefill,
  onPartnerNoticeClick,
  stationStatus,
}: DashboardHeaderProps) {
  const isMaintenance = stationStatus === 'Under Maintenance';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{greeting}, {userName}!</h1>
        <div className="flex items-center gap-2">
            <p className="text-sm sm:text-base text-muted-foreground">
              Here is your hydration snapshot for today.
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block" />
            <button 
                onClick={onPartnerNoticeClick}
                className={cn(
                    "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all border",
                    isMaintenance 
                        ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" 
                        : "bg-green-50 text-green-600 border-green-200"
                )}
            >
                {isMaintenance ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                Station: {stationStatus || 'Operational'}
            </button>
        </div>
      </div>
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Button
          variant={hasPendingRefill ? "secondary" : "default"}
          className={cn(
            "flex-1 sm:flex-none rounded-full h-11 px-6 font-bold shadow-lg transition-transform active:scale-95",
            !hasPendingRefill && "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          )}
          onClick={onRefillRequest}
        >
          <BellRing className={cn("mr-2 h-4 w-4", hasPendingRefill && "text-blue-500")} />
          {hasPendingRefill ? 'Refill Status' : 'Request Refill'}
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:flex-none rounded-full h-11 px-6 font-bold bg-background shadow-sm border-slate-200 hover:bg-slate-50 transition-transform active:scale-95"
          onClick={onComplianceClick}
        >
          <ShieldCheck className="h-4 w-4 sm:mr-2 text-primary" />
          <span className="hidden sm:inline">Compliance & Sanitation</span>
          <span className="sm:hidden text-xs">Quality</span>
        </Button>
      </div>
    </div>
  );
}
