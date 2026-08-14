import { useEffect, useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/use-toast';
import { useUpdateStyleRoom } from '../../queries/styleRoomQueries';
import { RoomFormFields } from './CreateRoomDialog';

const RoomEditDialog = ({ open, onOpenChange, room }) => {
  const { toast } = useToast();
  const updateRoom = useUpdateStyleRoom(room?.id);
  const [form, setForm] = useState({ title: '', description: '', visibility: 'private' });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (open && room) {
      setForm({
        title: room.title || '',
        description: room.description || '',
        visibility: room.visibility || 'private',
      });
      setValidationError('');
    }
  }, [open, room]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setValidationError('عنوان اتاق الزامی است.');
      return;
    }
    setValidationError('');
    updateRoom.mutate({
      title,
      description: form.description.trim(),
      visibility: form.visibility,
    }, {
      onSuccess: () => {
        toast({ title: 'ذخیره شد', description: 'تغییرات اتاق ذخیره شد.' });
        onOpenChange(false);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'ذخیره تغییرات ممکن نشد.';
        toast({ title: 'خطا', description: message, variant: 'destructive' });
        setValidationError(message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black">
              <Settings2 className="h-5 w-5" />
            </span>
            ویرایش اتاق
          </DialogTitle>
          <DialogDescription>عنوان، توضیحات و حریم خصوصی اتاق را به‌روزرسانی کنید.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RoomFormFields form={form} setForm={setForm} submitting={updateRoom.isPending} />
          {validationError && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              {validationError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateRoom.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={updateRoom.isPending}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110"
            >
              {updateRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره تغییرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomEditDialog;