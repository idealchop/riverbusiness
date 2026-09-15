'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function NamePromptPopover({
  open,
  onOpenChange,
  trigger,
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  submitLabel = 'Create',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-3 rounded-2xl border-slate-200 shadow-xl bg-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
        <Input
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="h-10 rounded-xl bg-slate-50 border-slate-100 font-semibold text-sm"
        />
        <div className="flex justify-end mt-3">
          <Button
            size="sm"
            className="h-8 rounded-lg px-4 font-bold text-xs"
            disabled={!value.trim()}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
