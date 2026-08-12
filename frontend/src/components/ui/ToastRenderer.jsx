import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast';

const ToastRenderer = ({ toasts, dismiss }) => (
  <ToastProvider>
    <ToastViewport>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onOpenChange={(open) => !open && dismiss(toast.id)}
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
    </ToastViewport>
  </ToastProvider>
);

export default ToastRenderer;
