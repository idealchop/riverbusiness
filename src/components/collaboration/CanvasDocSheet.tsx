'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Editor } from '@/components/collaboration/Editor';
import { Input } from '@/components/ui/input';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function CanvasDocSheet({
  open,
  docId,
  title,
  content,
  editable = true,
  companyId,
  onTitleChange,
  onContentChange,
  onClose,
}: {
  open: boolean;
  docId: string;
  title: string;
  content: any;
  editable?: boolean;
  companyId?: string;
  onTitleChange: (title: string) => void;
  onContentChange: (json: any) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [shown, setShown] = useState(false);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShown(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevLayout = html.dataset.docsLayout;
    html.dataset.docsLayout = 'vertical';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prevLayout) html.dataset.docsLayout = prevLayout;
      else delete html.dataset.docsLayout;
    };
  }, [open]);

  if (!mounted || !render) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close document"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-900/40 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          shown ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'absolute bottom-0 left-[10%] w-[80%] h-[min(92vh,900px)] flex flex-col rounded-t-[28px] bg-[#f1f3f4] shadow-[0_-18px_60px_rgba(15,23,42,0.18)]',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          shown ? 'translate-y-0' : 'translate-y-full'
        )}
        onTransitionEnd={(e) => {
          if (e.propertyName !== 'transform') return;
          if (!open) setRender(false);
        }}
      >
        <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center gap-3 px-5 sm:px-8 pb-3 border-b border-slate-200/80 bg-white/90 rounded-t-[28px] shrink-0">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            readOnly={!editable}
            className="h-11 border-none shadow-none bg-transparent text-lg font-bold px-0 focus-visible:ring-0 text-center sm:text-left"
            placeholder="Untitled document"
          />
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto docs-canvas docs-canvas-scroll">
          <div className="docs-paper mx-auto">
            <div className="docs-paper-body mx-auto">
              <div className="docs-editor-sheet bg-white min-h-[1056px]">
                <Editor
                  key={docId}
                  initialContent={content || EMPTY_DOC}
                  onContentChange={onContentChange}
                  editable={editable}
                  companyId={companyId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
