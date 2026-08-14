import { useState } from 'react';
import { Crown, Loader2, Trash2, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../chat/ChatDomainComponents';
import { Button } from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/use-toast';
import {
  useRemoveStyleRoomMember,
  useStyleRoomMembersQuery,
} from '../../queries/styleRoomQueries';
import { formatDateShort } from '../../lib/formatDate';
import AddMemberDialog from './AddMemberDialog';
import ConfirmDialog from './ConfirmDialog';

const MembersPanel = ({ roomId, isOwner, maxToShow = 0 }) => {
  const { toast } = useToast();
  const { data: members = [], isLoading, isError, refetch, isFetching } = useStyleRoomMembersQuery(roomId);
  const removeMember = useRemoveStyleRoomMember(roomId);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const shown = maxToShow > 0 ? members.slice(0, maxToShow) : members;

  const handleRemove = () => {
    if (!removeTarget) return;
    removeMember.mutate(removeTarget.user_id ?? removeTarget.user.id, {
      onSuccess: () => {
        const name = removeTarget.user?.display_name || removeTarget.user?.username;
        toast({ title: 'عضو حذف شد', description: `${name} از اتاق حذف شد.` });
        setRemoveTarget(null);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'حذف عضو ممکن نشد.';
        toast({ title: 'خطا', description: message, variant: 'destructive' });
        setRemoveTarget(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} delay={i * 0.05} className="h-20 w-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-8 text-center">
        <p className="text-sm font-bold text-foreground">بارگذاری اعضا ممکن نشد.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={Users}
        title="هنوز عضوی وجود ندارد"
        description="با اشتراک لینک دعوت یا جستجوی دوستان، افراد را به اتاق اضافه کنید."
      >
        {isOwner && (
          <Button
            type="button"
            onClick={() => setAddOpen(true)}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" />
            افزودن عضو
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {maxToShow > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {shown.map((member) => (
            <MemberChip key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 transition hover:border-amber-500/25"
            >
              <Avatar user={member.user} size={44} ring />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-foreground">
                    {member.user?.display_name || member.user?.username}
                  </p>
                  {member.role === 'owner' && (
                    <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="مالک" />
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span dir="ltr">@{member.user?.username}</span>
                  <span>عضویت: {formatDateShort(member.joined_at)}</span>
                </p>
              </div>
              {isOwner && member.role !== 'owner' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRemoveTarget(member)}
                  disabled={removeMember.isPending}
                  aria-label={`حذف ${member.user?.display_name || member.user?.username} از اتاق`}
                  className="text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="text-xs font-bold"
        >
          {removeMember.isPending || isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          افزودن عضو
        </Button>
      )}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} roomId={roomId} />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="حذف عضو از اتاق"
        message={`${removeTarget?.user?.display_name || removeTarget?.user?.username || ''} از اتاق حذف شود؟ این اقدام قابل بازگشت نیست.`}
        confirmLabel="حذف عضو"
        danger
        onConfirm={handleRemove}
        busy={removeMember.isPending}
      />
    </div>
  );
};

const MemberChip = ({ member }) => (
  <Link
    to="/chat"
    className="group flex w-20 flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-card/60 p-2.5 text-center transition hover:border-amber-500/30 hover:bg-amber-500/5"
    aria-label={member.user?.display_name || member.user?.username}
  >
    <div className="relative">
      <Avatar user={member.user} size={44} ring />
      {member.role === 'owner' && (
        <Crown className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background p-0.5 text-amber-500" />
      )}
    </div>
    <p className="w-full truncate text-[10px] font-bold text-foreground">
      {member.user?.display_name || member.user?.username}
    </p>
  </Link>
);

export default MembersPanel;