import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';

const LogoutConfirmDialog = ({ open, onOpenChange, onConfirm }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          خروج از حساب
        </DialogTitle>
        <DialogDescription>
          آیا مطمئن هستید که می‌خواید از حساب کاربری خود خارج شوید؟
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
        <Button variant="destructive" onClick={onConfirm}>
          بله، خارج شوم
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          انصراف
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default LogoutConfirmDialog;
