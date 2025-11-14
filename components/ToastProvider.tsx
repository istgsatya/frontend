"use client"
import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type ToastVariant = 'success' | 'error' | 'info'
export type ToastOptions = { title?: string; message: string; variant?: ToastVariant; duration?: number }

type Toast = Required<ToastOptions> & { id: number }

type ToastContextType = {
  show: (opts: ToastOptions) => number
  success: (message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => number
  error: (message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => number
  info: (message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((opts: ToastOptions) => {
    const id = idRef.current++
    const toast: Toast = {
      id,
      title: opts.title ?? '',
      message: opts.message,
      variant: opts.variant ?? 'info',
      duration: opts.duration ?? 3500,
    }
    setToasts((t) => [toast, ...t])
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }, [dismiss])

  const success = useCallback((message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => show({ message, variant: 'success', ...(opts || {}) }), [show])
  const error = useCallback((message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => show({ message, variant: 'error', ...(opts || {}) }), [show])
  const info = useCallback((message: string, opts?: Omit<ToastOptions, 'message' | 'variant'>) => show({ message, variant: 'info', ...(opts || {}) }), [show])

  const value = useMemo(() => ({ show, success, error, info, dismiss }), [show, success, error, info, dismiss])

  // Override window.alert to route through toast system for consistent UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const original = window.alert
      ;(window as any).alert = (msg?: any) => {
        const text = typeof msg === 'string' ? msg : String(msg)
        show({ message: text, variant: 'info' })
        return undefined
      }
      return () => {
        window.alert = original
      }
    }
  }, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        <div className="absolute top-3 right-3 w-full max-w-sm space-y-2 pointer-events-none">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-auto card p-4 shadow-glass border dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <div className={
                    t.variant === 'success' ? 'h-2 w-2 mt-2 rounded-full bg-emerald-500' :
                    t.variant === 'error' ? 'h-2 w-2 mt-2 rounded-full bg-rose-500' : 'h-2 w-2 mt-2 rounded-full bg-sky-500'
                  } />
                  <div className="flex-1">
                    {t.title ? <div className="text-sm font-medium mb-0.5">{t.title}</div> : null}
                    <div className="text-sm subtle">{t.message}</div>
                  </div>
                  <button onClick={() => dismiss(t.id)} className="btn-ghost text-xs">Close</button>
                </div>
                <motion.div
                  layout
                  className={`mt-3 h-1 w-full rounded overflow-hidden bg-slate-200/40 dark:bg-slate-700/40`}
                >
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: 0 }}
                    transition={{ duration: t.duration / 1000, ease: 'linear' }}
                    className={`${t.variant === 'success' ? 'bg-emerald-500' : t.variant === 'error' ? 'bg-rose-500' : 'bg-sky-500'} h-1`}
                  />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  )
}
