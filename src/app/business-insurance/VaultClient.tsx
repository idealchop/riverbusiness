
'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

/**
 * PS Vault (Minimal Placeholder)
 * A super-minimalist landing page indicating future functionality.
 */
export default function VaultClient() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-1000">
        {/* Minimal Building Icon */}
        <Building2 className="h-6 w-6 text-slate-200" />
        
        {/* Small Minimal Text */}
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">
          Coming Soon
        </p>
        
        {/* Navigation Return */}
        <Link 
          href="/dashboard" 
          className="mt-8 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all opacity-50 hover:opacity-100"
        >
          Back to Core
        </Link>
      </div>
    </main>
  );
}
