'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceChromeValue = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  claimSidebarExpand: () => () => void;
  sidebarExpandClaimed: boolean;
};

const WorkspaceChromeContext = createContext<WorkspaceChromeValue | null>(null);

export function WorkspaceChromeProvider({
  isSidebarOpen,
  toggleSidebar,
  children,
}: {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  children: React.ReactNode;
}) {
  const [sidebarExpandClaimed, setSidebarExpandClaimed] = useState(false);
  const claimSidebarExpand = useCallback(() => {
    setSidebarExpandClaimed(true);
    return () => setSidebarExpandClaimed(false);
  }, []);

  const value = useMemo(
    () => ({ isSidebarOpen, toggleSidebar, claimSidebarExpand, sidebarExpandClaimed }),
    [isSidebarOpen, toggleSidebar, claimSidebarExpand, sidebarExpandClaimed]
  );

  return <WorkspaceChromeContext.Provider value={value}>{children}</WorkspaceChromeContext.Provider>;
}

export function useWorkspaceChrome() {
  return useContext(WorkspaceChromeContext);
}

const toggleClassName = 'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900';

export function SidebarEdgeToggle() {
  const chrome = useWorkspaceChrome();
  if (!chrome || !chrome.isSidebarOpen) return null;
  return (
    <button
      type="button"
      onClick={chrome.toggleSidebar}
      title="Hide sidebar"
      className={cn('absolute top-1/2 z-40 -translate-y-1/2', toggleClassName)}
      style={{ left: 'calc(18rem - 16px)' }}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}

export function SidebarMainExpandToggle() {
  const chrome = useWorkspaceChrome();
  if (!chrome || chrome.isSidebarOpen || chrome.sidebarExpandClaimed) return null;
  return (
    <button
      type="button"
      onClick={chrome.toggleSidebar}
      title="Show sidebar"
      className={cn('absolute left-2 top-1/2 z-[60] -translate-y-1/2', toggleClassName)}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

export function CanvasSidebarExpandToggle() {
  const chrome = useWorkspaceChrome();
  if (!chrome || chrome.isSidebarOpen) return null;
  return (
    <button
      type="button"
      data-canvas-chrome="true"
      onClick={chrome.toggleSidebar}
      onPointerDown={(e) => e.stopPropagation()}
      title="Show sidebar"
      aria-label="Show sidebar"
      className={cn('mb-1 shrink-0', toggleClassName)}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
