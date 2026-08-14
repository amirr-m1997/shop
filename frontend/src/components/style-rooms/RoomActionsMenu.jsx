import { useState } from 'react';
import { KeyRound, Loader2, LogOut, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import InviteTokenDialog from './InviteTokenDialog';
import RoomEditDialog from './RoomEditDialog';
import ConfirmDialog from './ConfirmDialog';

const RoomActionsMenu = ({ room, onDelete, onLeave, deleting = false, leaving = false }) => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const isOwner = room?.my_role === 'owner' || room?.is_owner === true;
  const canDelete = isOwner || room?.can_delete === true;

  const handleConfirm = () => {
    if (confirmAction === 'delete') onDelete?.();
    if (confirmAction === 'leave') onLeave?.();
    setConfirmAction(null);
  };

  const menuItem =
    'flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/60';

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="گزینه‌های بیشتر اتاق"
          aria-expanded={open}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 text-amber-700 shadow-sm shadow-amber-500/10 transition hover:bg-amber-500/20 hover:text-amber-800 active:scale-95 dark:text-amber-400 dark:hover:text-amber-300"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="hidden text-[11px] font-bold sm:inline">بیشتر</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/60 bg-popover py-1 text-right shadow-2xl">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditOpen(true);
                      setOpen(false);
                    }}
                    className={menuItem}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    ویرایش اتاق
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInviteOpen(true);
                      setOpen(false);
                    }}
                    className={menuItem}
                  >
                    <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    ساخت دعوت‌نامه
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setConfirmAction('delete');
                    }}
                    className={`${menuItem} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    حذف اتاق
                  </button>
                </>
              ) : canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setConfirmAction('delete');
                  }}
                  className={`${menuItem} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  حذف اتاق
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setConfirmAction('leave');
                  }}
                  className={`${menuItem} text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                >
                  {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  ترک اتاق
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <RoomEditDialog open={editOpen} onOpenChange={setEditOpen} room={room} />
      <InviteTokenDialog open={inviteOpen} onOpenChange={setInviteOpen} roomId={room?.id} roomTitle={room?.title} />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title={confirmAction === 'delete' ? 'حذف اتاق استایل' : 'ترک اتاق استایل'}
        message={
          confirmAction === 'delete'
            ? `اتاق «${room?.title || ''}» برای همیشه حذف شود؟ این اقدام قابل بازگشت نیست.`
            : `از اتاق «${room?.title || ''}» خارج شوید؟`
        }
        confirmLabel={confirmAction === 'delete' ? 'حذف اتاق' : 'ترک اتاق'}
        danger
        onConfirm={handleConfirm}
        busy={deleting || leaving}
      />
    </>
  );
};

export default RoomActionsMenu;
