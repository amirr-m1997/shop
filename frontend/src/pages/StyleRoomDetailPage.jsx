import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Info, Loader2, Lock, Package, Users, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { Avatar } from '../components/chat/ChatDomainComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { useDeleteStyleRoom, useLeaveStyleRoom, useStyleRoomDetailQuery } from '../queries/styleRoomQueries';
import { formatDateShort } from '../lib/formatDate';
import RoomCover from '../components/style-rooms/RoomCover';
import MembersPanel from '../components/style-rooms/MembersPanel';
import ItemsPanel from '../components/style-rooms/ItemsPanel';
import ActivityPanel from '../components/style-rooms/ActivityPanel';
import RoomActionsMenu from '../components/style-rooms/RoomActionsMenu';
import JoinRoomPrompt from '../components/style-rooms/JoinRoomPrompt';
import StyleRoomConversation from '../components/style-rooms/StyleRoomConversation';
import { RoomMetaChip, RoomRoleBadge, RoomVisibilityBadge } from '../components/style-rooms/StyleRoomCard';

const DetailsSkeleton = () => (
  <div className="container mx-auto space-y-6 px-4 py-8"><Skeleton className="h-6 w-32 rounded-lg" /><div className="overflow-hidden rounded-3xl border border-border/60 bg-card"><Skeleton className="h-40 w-full rounded-none" noDelay /><div className="space-y-4 p-5"><div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-full" noDelay /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-2/3 rounded" noDelay /><Skeleton className="h-3 w-1/3 rounded" noDelay /></div></div></div></div><Skeleton className="h-56 w-full rounded-3xl" noDelay /></div>
);

const StyleRoomDetailPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobilePanel, setMobilePanel] = useState(null);
  const inviteToken = searchParams.get('invite') || '';
  const detail = useStyleRoomDetailQuery(roomId);
  const deleteRoom = useDeleteStyleRoom(roomId);
  const leaveRoom = useLeaveStyleRoom(roomId);
  const room = detail.data;
  const isOwner = useMemo(() => Boolean(room && (room.my_role === 'owner' || room.is_owner)), [room]);

  if (!user) return <div className="flex min-h-[70vh] items-center justify-center px-4 text-center"><EmptyState title="برای ورود به اتاق‌های استایل، وارد حساب شوید" primaryLabel="ورود" primaryTo="/login" /></div>;
  if (detail.isLoading) return <DetailsSkeleton />;
  if (detail.isError && detail.error?.response?.status === 404) {
    if (inviteToken) return <JoinRoomPrompt roomId={roomId} initialToken={inviteToken} onJoined={() => navigate(`/style-rooms/${roomId}`, { replace: true })} onBack={() => navigate('/style-rooms')} />;
    return <div className="container mx-auto px-4 py-16"><EmptyState icon={Users} title="دسترسی به این اتاق ندارید" description="ممکن است اتاق وجود نداشته باشد یا دیگر عضو آن نباشید." primaryLabel="بازگشت به اتاق‌های من" primaryTo="/style-rooms" /></div>;
  }
  if (detail.isError || !room) return <div className="container mx-auto px-4 py-16"><EmptyState title="خطا در بارگذاری اتاق" description={detail.error?.response?.data?.error || 'لطفاً دوباره تلاش کنید.'} primaryLabel="تلاش دوباره" primaryOnClick={() => detail.refetch()} secondaryLabel="بازگشت" secondaryTo="/style-rooms" /></div>;

  const handleDelete = () => deleteRoom.mutate(undefined, { onSuccess: () => { toast({ title: 'اتاق حذف شد' }); navigate('/style-rooms'); }, onError: () => toast({ title: 'حذف اتاق ممکن نشد', variant: 'destructive' }) });
  const handleLeave = () => leaveRoom.mutate(undefined, { onSuccess: () => { toast({ title: 'از اتاق خارج شدید' }); navigate('/style-rooms'); }, onError: () => toast({ title: 'خروج از اتاق ممکن نشد', variant: 'destructive' }) });
  const ownerName = room.owner?.display_name || room.owner?.username || 'عضو';

  return (
    <div dir="rtl" className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
      <Link to="/style-rooms" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"><ArrowRight className="h-4 w-4" />بازگشت به اتاق‌های استایل</Link>
      <header className="relative z-20 mb-4 rounded-3xl border border-border/60 bg-card shadow-sm">
        <div className="relative h-28 overflow-hidden rounded-t-3xl sm:h-40"><RoomCover room={room} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" /><div className="absolute right-3 top-3"><RoomVisibilityBadge visibility={room.visibility} /></div><div className="absolute bottom-3 left-4 right-4 flex items-end justify-between sm:bottom-4 sm:left-5 sm:right-5"><div><RoomRoleBadge role={room.my_role} /><h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">{room.title}</h1></div><div className="flex items-center gap-2"><Avatar user={room.owner} size={30} ring={false} /><span className="hidden text-xs font-bold text-white/90 sm:block">{ownerName}</span></div></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"><div className="flex flex-wrap gap-1.5"><RoomMetaChip icon={Users} label="اعضا" value={room.member_count} /><RoomMetaChip icon={Package} label="ذخیره‌شده" value={room.item_count} /><span className="hidden items-center rounded-full border border-border/50 bg-secondary/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground sm:inline-flex">ایجاد {formatDateShort(room.created_at)}</span></div><div className="flex items-center gap-2">{room.my_role === 'member' && <Button type="button" variant="outline" size="sm" onClick={handleLeave} disabled={leaveRoom.isPending} className="text-xs font-bold">{leaveRoom.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}ترک اتاق</Button>}<RoomActionsMenu room={room} onDelete={handleDelete} onLeave={handleLeave} deleting={deleteRoom.isPending} leaving={leaveRoom.isPending} /></div></div>
      </header>

      <div className="mb-3 flex gap-2 overflow-x-auto lg:hidden"><button type="button" onClick={() => setMobilePanel('members')} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-bold text-muted-foreground"><Users className="h-3.5 w-3.5" />اعضا</button><button type="button" onClick={() => setMobilePanel('items')} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-bold text-muted-foreground"><Package className="h-3.5 w-3.5" />محصولات ذخیره‌شده</button><button type="button" onClick={() => setMobilePanel('activity')} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-bold text-muted-foreground"><Info className="h-3.5 w-3.5" />فعالیت‌ها</button></div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <StyleRoomConversation roomId={room.id} currentUserId={user.id} />
        <aside className={`${mobilePanel ? 'fixed inset-y-0 right-0 z-[80] flex w-[min(92vw,360px)]' : 'hidden'} flex-col gap-4 overflow-y-auto border-l border-border/60 bg-background p-4 shadow-2xl lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-7rem)] lg:w-auto lg:border-l-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          <div className="flex items-center justify-between lg:hidden"><p className="text-sm font-black text-foreground">جزئیات اتاق</p><button type="button" onClick={() => setMobilePanel(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"><X className="h-4 w-4" /></button></div>
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">اعضا</p></div><MembersPanel roomId={room.id} isOwner={isOwner} maxToShow={8} /></div>
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4"><div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">محصولات ذخیره‌شده</p></div><ItemsPanel roomId={room.id} room={room} currentUserId={user.id} /></div>
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4"><div className="mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">فعالیت‌های اتاق</p></div><ActivityPanel roomId={room.id} /></div>
        </aside>
      </div>
      {mobilePanel && <button type="button" aria-label="Close room details" onClick={() => setMobilePanel(null)} className="fixed inset-0 z-[70] bg-black/40 lg:hidden" />}
      {room.my_role === 'owner' && <p className="mt-3 hidden items-center gap-1 text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80 sm:flex"><Lock className="h-3 w-3" />شما مالک این اتاق استایل هستید</p>}
    </div>
  );
};

export default StyleRoomDetailPage;
