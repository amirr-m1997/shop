import { Loader2, Package, PackageX, UserMinus, UserPlus, History } from 'lucide-react';
import { Avatar } from '../chat/ChatDomainComponents';
import { Button } from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useStyleRoomActivityQuery } from '../../queries/styleRoomQueries';
import { formatRelativeDate } from '../../lib/formatDate';

const EVENT_LABELS = {
  'room.created': { text: 'اتاق را ساخت', icon: History },
  'room.updated': { text: 'اتاق را به‌روزرسانی کرد', icon: History },
  'room.member_invited': { text: 'را به اتاق دعوت کرد', icon: UserPlus },
  'room.member_joined': { text: 'به اتاق پیوست', icon: UserPlus },
  'room.member_left': { text: 'از اتاق خارج شد', icon: UserMinus },
  'room.member_removed': { text: 'را از اتاق حذف کرد', icon: UserMinus },
  'room.item_added': { text: 'محصول را به اتاق اضافه کرد', icon: Package },
  'room.item_removed': { text: 'محصول را از اتاق حذف کرد', icon: PackageX },
};

const ActivityItem = ({ event }) => {
  const meta = EVENT_LABELS[event.type] || { text: 'فعالیت جدید', icon: History };
  const Icon = meta.icon;
  const actorName = event.actor?.display_name || event.actor?.username || 'کاربر';
  const targetName = event.payload?.product_name || event.payload?.username;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-3">
      <div className="relative shrink-0">
        <Avatar user={event.actor} size={40} ring={false} />
        <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-2 ring-background dark:text-amber-400">
          <Icon className="h-3 w-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-bold leading-snug text-foreground">
          <span>{actorName}</span>{' '}
          <span className="font-medium text-muted-foreground">{meta.text}</span>
          {targetName && <span className="font-bold text-foreground"> «{targetName}»</span>}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeDate(event.created_at)}</p>
      </div>
    </div>
  );
};

const ActivityPanel = ({ roomId }) => {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useStyleRoomActivityQuery(roomId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} delay={i * 0.05} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
        <p className="text-sm font-bold text-foreground">بارگذاری فعالیت‌ها ممکن نشد.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={History}
        title="هنوز فعالیتی ثبت نشده"
        description="وقتی اعضا محصولی اضافه کنند یا به اتاق بپیوندند، اینجا نمایش داده می‌شود."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground">
          {events.length.toLocaleString('fa-IR')} رویداد
        </p>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-500" />}
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default ActivityPanel;