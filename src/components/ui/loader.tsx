'use client';

import { cn } from "@/lib/utils";

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("loading-dots", className)}>
      <div className="dot" />
      <div className="dot" />
      <div className="dot" />
    </div>
  );
}

export function FullScreenLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader className="text-primary h-8" />
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
