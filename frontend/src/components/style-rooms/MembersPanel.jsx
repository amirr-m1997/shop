import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2, Trash2, UserPlus, Users, MessageCircle } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { chatAPI } from '../../services/api';
import AddMemberDialog from './AddMemberDialog';
import ConfirmDialog from './ConfirmDialog';

const MembersPanel = ({ roomId, isOwner, maxToShow = 0 }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: members = [], isLoading, isError, refetch, isFetching } = useStyleRoomMembersQuery(roomId);
  const removeMember = useRemoveStyleRoomMember(roomId);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [startingChat, setStartingChat] = useState(false);

  const handleStartChat = async () => {
    if (!profileMember?.user?.id) return;
    if (startingChat) return;
    setStartingChat(true);
    try {
      const res = await chatAPI.createConversation({ user_id: profileMember.user.id });
      const conv = res.data;
      const convId = conv?.id || conv?.conversation?.id || conv?.conversation_id;
      setProfileMember(null);
      if (convId) navigate(`/chat/${convId}`);
      else navigate('/chat');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.response?.data?.message || 'ایجاد گفتگو ممکن نشد.';
      toast({ title: 'خطا', description: msg, variant: 'destructive' });
    } finally {
      setStartingChat(false);
    }
  };

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
            <MemberChip key={member.id} member={member} onOpenProfile={() => setProfileMember(member)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setProfileMember(member)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 text-start transition hover:border-amber-500/25 hover:bg-secondary/50"
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
                  onClick={(e) => { e.stopPropagation(); setRemoveTarget(member); }}
                  disabled={removeMember.isPending}
                  aria-label={`حذف ${member.user?.display_name || member.user?.username} از اتاق`}
                  className="text-muted-foreground hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </button>
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

      <Dialog open={Boolean(profileMember)} onOpenChange={(v) => !v && setProfileMember(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>پروفایل عضو</DialogTitle>
          </DialogHeader>
          {profileMember && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="relative">
                <Avatar user={profileMember.user} size={72} ring />
                {profileMember.role === 'owner' && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                    <Crown className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-base font-black text-foreground">{profileMember.user?.display_name || profileMember.user?.username}</p>
                <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">@{profileMember.user?.username}</p>
                {profileMember.role === 'owner' && <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400"><Crown className="h-3 w-3" /> مالک اتاق</p>}
                <p className="mt-2 text-xs text-muted-foreground">عضویت: {formatDateShort(profileMember.joined_at)}</p>
              </div>
              <div className="flex w-full gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setProfileMember(null)}>بستن</Button>
                <Button type="button" disabled={startingChat} className="flex-1 gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold" onClick={handleStartChat}>
                  {startingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} ارسال پیام
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MemberChip = ({ member, onOpenProfile }) => (
  <button
    type="button"
    onClick={onOpenProfile}
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
  </button>
);

export default MembersPanel;