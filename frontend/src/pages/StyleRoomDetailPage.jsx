import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Info, Loader2, Lock, Package, PanelRightOpen, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { Avatar } from '../components/chat/ChatDomainComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { useDeleteStyleRoom, useLeaveStyleRoom, useStyleRoomDetailQuery } from '../queries/styleRoomQueries';
import { formatDateShort } from '../lib/formatDate';
import { getRoomCoverGradient, hasRoomCoverImage } from '../lib/roomCovers';
import MembersPanel from '../components/style-rooms/MembersPanel';
import ItemsPanel from '../components/style-rooms/ItemsPanel';
import ActivityPanel from '../components/style-rooms/ActivityPanel';
import RoomActionsMenu from '../components/style-rooms/RoomActionsMenu';
import JoinRoomPrompt from '../components/style-rooms/JoinRoomPrompt';
import StyleRoomConversation from '../components/style-rooms/StyleRoomConversation';
import { RoomRoleBadge, RoomVisibilityBadge } from '../components/style-rooms/StyleRoomCard';

const DetailsSkeleton = () => (
  <div className="container mx-auto space-y-4 px-4 py-6">
    <Skeleton className="h-16 w-full rounded-2xl" />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Skeleton className="h-[60vh] w-full rounded-3xl" />
      <Skeleton className="hidden h-[60vh] w-full rounded-3xl lg:block" />
    </div>
  </div>
);

const CompactRoomAvatar = ({ room }) => {
  const gradient = getRoomCoverGradient(room);
  if (hasRoomCoverImage(room)) {
    return <img src={room.cover} alt={room.title || ''} className="h-10 w-10 shrink-0 rounded-xl object-cover sm:h-11 sm:w-11" />;
  }
  const initial = (room.title || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm sm:h-11 sm:w-11 sm:text-base ${gradient}`}>
      {initial}
    </div>
  );
};

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
    <div dir="rtl" className="container mx-auto flex flex-1 min-h-0 flex-col gap-4 px-3 pt-4 pb-[calc(4.75rem+env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pt-5 sm:pb-5 md:pb-5">
      {/* ── Compact Room Header (64-88px) ── */}
      <header className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-card px-3 py-3 shadow-sm sm:gap-3 sm:px-4 sm:py-3.5">
        <Link
          to="/style-rooms"
          aria-label="بازگشت به اتاق‌های استایل"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>

        <CompactRoomAvatar room={room} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-[15px] font-black tracking-tight text-foreground sm:text-base">{room.title}</h1>
            <RoomRoleBadge role={room.my_role} />
            <span className="hidden sm:inline-flex"><RoomVisibilityBadge visibility={room.visibility} /></span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{room.member_count.toLocaleString('fa-IR')} عضو</span>
            <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{room.item_count.toLocaleString('fa-IR')} محصول</span>
            <span className="hidden items-center gap-1 sm:inline-flex">• {formatDateShort(room.created_at)}</span>
            <span className="hidden items-center gap-1.5 truncate sm:inline-flex">• <Avatar user={room.owner} size={18} ring={false} /><span className="truncate text-[11px] font-bold text-muted-foreground">{ownerName}</span></span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {room.my_role === 'member' && (
            <Button type="button" variant="outline" size="sm" onClick={handleLeave} disabled={leaveRoom.isPending} className="hidden text-xs font-bold sm:inline-flex">
              {leaveRoom.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}ترک اتاق
            </Button>
          )}
          <RoomActionsMenu room={room} onDelete={handleDelete} onLeave={handleLeave} deleting={deleteRoom.isPending} leaving={leaveRoom.isPending} />
          <button
            type="button"
            onClick={() => setMobilePanel('members')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="نمایش جزئیات اتاق"
          >
            <PanelRightOpen className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Chat-first Workspace — flex height, no 100vh calc ── */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch">
        {/* Main Chat — dominates viewport, independent scroll */}
        <div className="flex min-h-[280px] flex-1 min-h-0 flex-col lg:min-h-0">
          <StyleRoomConversation roomId={room.id} currentUserId={user.id} />
        </div>

        {/* Secondary Sidebar — desktop visible, mobile drawer */}
        <aside
          className={`${
            mobilePanel ? 'fixed inset-y-0 right-0 z-[80] flex w-[min(92vw,360px)]' : 'hidden'
          } flex-col gap-3 overflow-y-auto border-l border-border/60 bg-background p-4 shadow-2xl lg:static lg:flex lg:min-h-0 lg:w-auto lg:overflow-y-auto lg:border-l-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <p className="text-sm font-black text-foreground">جزئیات اتاق</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">اعضا</p></div>
            <MembersPanel roomId={room.id} isOwner={isOwner} maxToShow={8} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">محصولات ذخیره‌شده</p></div>
            <ItemsPanel roomId={room.id} room={room} currentUserId={user.id} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2"><Info className="h-4 w-4 text-amber-600" /><p className="text-sm font-black text-foreground">فعالیت‌ها</p></div>
            <ActivityPanel roomId={room.id} />
          </div>

          {isOwner && (
            <p className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5" />شما مالک این اتاق هستید
            </p>
          )}
        </aside>
      </div>

      {mobilePanel && <button type="button" aria-label="Close room details" onClick={() => setMobilePanel(null)} className="fixed inset-0 z-[70] bg-black/40 lg:hidden" />}
    </div>
  );
};

export default StyleRoomDetailPage;
