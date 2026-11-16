'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  greeting: string;
  userName?: string;
  onPartnerNoticeClick: () => void;
  stationStatus?: 'Operational' | 'Under Maintenance';
  isActivated?: boolean;
}

export function DashboardHeader({
  greeting,
  userName,
  onPartnerNoticeClick,
  stationStatus,
  isActivated = true,
}: DashboardHeaderProps) {
  const isMaintenance = stationStatus === 'Under Maintenance';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-2">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{greeting}, {userName}!</h1>
        <div className="flex items-center gap-2">
            <p className="text-sm sm:text-base text-muted-foreground">
              Here is your hydration snapshot for today.
            </p>
            {isActivated && (
                <>
                    <div className="h-1 w-1 rounded-full bg-slate-300 hidden sm:block" />
                    <button 
                        onClick={onPartnerNoticeClick}
                        className={cn(
                            "flex items-center justify-center h-6 w-6 rounded-full transition-all border shadow-sm hover:scale-110 active:scale-95",
                            isMaintenance 
                                ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" 
                                : "bg-green-50 text-green-600 border-green-200"
                        )}
                        title={`Station Status: ${stationStatus || 'Operational'}`}
                    >
                        {isMaintenance ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
