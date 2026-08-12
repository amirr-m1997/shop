import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter } from './Dialog';
import { Button } from './Button';
import { cn } from '../../lib/utils';

const STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 ring-emerald-500/20',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-500/10 ring-red-500/20',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10 ring-amber-500/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10 ring-blue-500/20',
  },
};

const FeedbackModal = ({
  open,
  onClose,
  type = 'info',
  title,
  message,
  children,
  primaryLabel,
  onPrimary,
  primaryClassName,
  secondaryLabel = 'بستن',
  onSecondary,
}) => {
  const { icon: Icon, iconClass, bgClass } = STYLES[type] || STYLES.info;

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-md text-center sm:text-center gap-0 p-6 sm:p-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ring-1 bg-background/60 mb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgClass}`}>
            <Icon className={`h-7 w-7 ${iconClass}`} />
          </div>
        </div>
        {title && (
          <h3 className="text-lg font-bold text-foreground mb-1.5">{title}</h3>
        )}
        {message && (
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        )}
        {children}
        <DialogFooter className="mt-6 gap-2 sm:justify-center">
          {primaryLabel && onPrimary && (
            <Button size="lg" onClick={onPrimary} className={cn("flex-1 sm:flex-none rounded-xl", primaryClassName)}>
              {primaryLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button size="lg" variant="outline" onClick={onSecondary} className="flex-1 sm:flex-none rounded-xl">
              {secondaryLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
