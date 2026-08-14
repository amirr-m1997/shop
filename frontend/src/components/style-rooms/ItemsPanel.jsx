import { useState } from 'react';
import { Loader2, PackagePlus, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/use-toast';
import {
  useAddStyleRoomItem,
  useRemoveStyleRoomItem,
  useStyleRoomItemsQuery,
} from '../../queries/styleRoomQueries';
import RoomItemCard from './RoomItemCard';
import AddItemDialog from './AddItemDialog';
import ConfirmDialog from './ConfirmDialog';

const ItemsPanel = ({ roomId, room, currentUserId }) => {
  const { toast } = useToast();
  const { data: items = [], isLoading, isError, refetch } = useStyleRoomItemsQuery(roomId);
  const addItem = useAddStyleRoomItem(roomId);
  const removeItem = useRemoveStyleRoomItem(roomId);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const isOwner = room?.my_role === 'owner' || room?.is_owner === true;
  const canRemove = (item) =>
    isOwner || Boolean(currentUserId && item.added_by?.id === currentUserId);

  const handleRemove = () => {
    if (!removeTarget) return;
    removeItem.mutate(removeTarget.id, {
      onSuccess: () => {
        toast({ title: 'حذف شد', description: 'محصول از اتاق حذف شد.' });
        setRemoveTarget(null);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'حذف محصول ممکن نشد.';
        toast({ title: 'خطا', description: message, variant: 'destructive' });
        setRemoveTarget(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} delay={i * 0.06} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
        <p className="text-sm font-bold text-foreground">بارگذاری محصولات ممکن نشد.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          size="compact"
          icon={Package}
          title="هنوز محصولی اضافه نشده"
          description="محصولات موردعلاقه را به اتاق اضافه کنید و با اعضا به‌اشتراک بگذارید."
        >
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110"
          >
            {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
            افزودن محصول
          </Button>
        </EmptyState>
        <AddItemDialog open={addOpen} onOpenChange={setAddOpen} roomId={roomId} addItem={addItem} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">
          {items.length.toLocaleString('fa-IR')} محصول در اتاق
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-md shadow-amber-500/20 hover:brightness-110"
        >
          {addItem.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <PackagePlus className="h-3.5 w-3.5" />
          )}
          افزودن محصول
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        {items.map((item) => (
          <RoomItemCard
            key={item.id}
            item={item}
            canRemove={canRemove(item)}
            onRemove={setRemoveTarget}
            removing={removeItem.isPending && removeTarget?.id === item.id}
          />
        ))}
      </div>

      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} roomId={roomId} addItem={addItem} />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="حذف محصول از اتاق"
        message={`«${removeTarget?.product?.name || 'این محصول'}» از اتاق حذف شود؟`}
        confirmLabel="حذف محصول"
        danger
        onConfirm={handleRemove}
        busy={removeItem.isPending}
      />
    </div>
  );
};

export default ItemsPanel;
