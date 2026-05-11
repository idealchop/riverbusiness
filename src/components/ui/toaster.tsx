"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isDestructive = variant === "destructive";
        const Icon = isDestructive ? AlertCircle : CheckCircle2;
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-4">
              <div className={cn(
                  "p-2 rounded-xl mt-0.5 shadow-sm",
                  isDestructive ? "bg-red-50 text-red-600" : "bg-blue-50 text-primary"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
