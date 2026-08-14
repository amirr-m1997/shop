import { useEffect, useState } from 'react';
import { Loader2, Shirt } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/Select';
import { useToast } from '../ui/use-toast';
import { useCreateStyleRoom } from '../../queries/styleRoomQueries';

const initialState = { title: '', description: '', visibility: 'private' };

const RoomFormFields = ({ form, setForm, submitting }) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <label htmlFor="room-title" className="text-xs font-bold text-foreground">
        عنوان اتاق <span className="text-rose-500">*</span>
      </label>
      <Input
        id="room-title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="مثلاً: استایل‌برد پاییز"
        maxLength={120}
        disabled={submitting}
        autoFocus
      />
    </div>

    <div className="space-y-1.5">
      <label htmlFor="room-description" className="text-xs font-bold text-foreground">
        توضیحات
      </label>
      <textarea
        id="room-description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="درباره هدف این اتاق استایل بنویسید..."
        rows={3}
        disabled={submitting}
        className="w-full resize-none rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
      />
    </div>

    <div className="space-y-1.5">
      <label htmlFor="room-visibility" className="text-xs font-bold text-foreground">
        حریم خصوصی
      </label>
      <Select
        value={form.visibility}
        onValueChange={(value) => setForm((f) => ({ ...f, visibility: value }))}
        disabled={submitting}
      >
        <SelectTrigger id="room-visibility" className="bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="private">خصوصی — فقط اعضا می‌بینند</SelectItem>
          <SelectItem value="invite_only">فقط با دعوت — ورود فقط با دعوت‌نامه</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

export { RoomFormFields };

const CreateRoomDialog = ({ open, onOpenChange, onCreated }) => {
  const { toast } = useToast();
  const createRoom = useCreateStyleRoom();
  const [form, setForm] = useState(initialState);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initialState);
      setValidationError('');
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setValidationError('عنوان اتاق الزامی است.');
      return;
    }
    setValidationError('');
    createRoom.mutate({
      title,
      description: form.description.trim(),
      visibility: form.visibility,
    }, {
      onSuccess: (response) => {
        toast({ title: 'اتاق ساخته شد', description: `اتاق «${response.data.title}» با موفقیت ایجاد شد.` });
        onOpenChange(false);
        onCreated?.(response.data);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'ایجاد اتاق ممکن نشد.';
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
              <Shirt className="h-5 w-5" />
            </span>
            ساخت اتاق استایل
          </DialogTitle>
          <DialogDescription>
            اتاقی برای به‌اشتراک‌گذاری محصولات و ایده‌های استایل با دوستان خود بسازید.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RoomFormFields form={form} setForm={setForm} submitting={createRoom.isPending} />
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
              disabled={createRoom.isPending}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={createRoom.isPending}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110"
            >
              {createRoom.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shirt className="h-4 w-4" />
              )}
              ساخت اتاق
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomDialog;