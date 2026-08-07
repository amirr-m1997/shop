import * as React from 'react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from './Toast'

const ToastContext = React.createContext(null)

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return context
}

function ToastProviderWithHook({ children }) {
  const [toasts, setToasts] = React.useState([])

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    ({ title, description, variant = 'default', duration = 5000 }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, title, description, variant }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return { id, dismiss: () => dismiss(id) }
    },
    [dismiss]
  )

  const value = React.useMemo(() => ({ toast, dismiss, toasts }), [toast, dismiss, toasts])

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider>
        {children}
        <ToastViewport>
          {toasts.map((t) => (
            <Toast key={t.id} variant={t.variant} onOpenChange={(open) => !open && dismiss(t.id)}>
              <div className="grid gap-1">
                {t.title && <ToastTitle>{t.title}</ToastTitle>}
                {t.description && <ToastDescription>{t.description}</ToastDescription>}
              </div>
              <ToastClose />
            </Toast>
          ))}
        </ToastViewport>
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export { ToastProviderWithHook as ToastProvider, useToast }
