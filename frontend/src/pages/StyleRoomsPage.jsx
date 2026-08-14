import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Shirt, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useStyleRoomsQuery } from '../queries/styleRoomQueries';
import StyleRoomCard from '../components/style-rooms/StyleRoomCard';
import CreateRoomDialog from '../components/style-rooms/CreateRoomDialog';
import ChatModeNavigation from '../components/chat/ChatModeNavigation';

const LoginGate = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center bg-background">
    <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shadow-2xl shadow-amber-500/10">
      <Shirt className="h-12 w-12" />
    </div>
    <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground">اتاق‌های استایل</h1>
    <p className="mb-8 max-w-md text-sm text-muted-foreground leading-relaxed">
      برای ساخت اتاق استایل، دعوت از دوستان و به‌اشتراک‌گذاری محصولات، وارد حساب کاربری خود شوید.
    </p>
    <Link
      to="/login"
      className="inline-flex h-12 items-center rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110"
    >
      ورود به حساب کاربری
    </Link>
  </div>
);

const StyleRoomsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useStyleRoomsQuery({ page_size: 100 });

  if (!user) {
    return <LoginGate />;
  }

  const rooms = data?.items || [];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <ChatModeNavigation className="mb-6 max-w-xl" />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            اتاق‌های استایل من
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            فضاهای مشترک برای هماهنگی و به‌اشتراک‌گذاری استایل با دوستان.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="self-start rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/25 transition hover:brightness-110 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          ساخت اتاق استایل
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} delay={i * 0.06} className="h-72 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Shirt}
          title="بارگذاری اتاق‌ها ناموفق بود"
          description="اتصال خود را بررسی کنید و دوباره تلاش کنید."
          primaryLabel="تلاش مجدد"
          primaryOnClick={() => refetch()}
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Users}
          title="هنوز اتاقی نساخته‌اید"
          description="اولین اتاق استایل خود را بسازید و دوستانتان را برای هم‌افزایی دعوت کنید."
          primaryLabel="ساخت اولین اتاق"
          primaryOnClick={() => setCreateOpen(true)}
          badge="اتاق استایل"
        />
      ) : (
        <>
          {isFetching && (
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-500" />
              در حال به‌روزرسانی...
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <StyleRoomCard key={room.id} room={room} />
            ))}
          </div>
        </>
      )}

      <CreateRoomDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(room) => {
          toast({ title: 'اتاق ساخته شد', description: `به اتاق «${room.title}» منتقل می‌شوید.` });
          navigate(`/style-rooms/${room.id}`);
        }}
      />
    </div>
  );
};

export default StyleRoomsPage;
