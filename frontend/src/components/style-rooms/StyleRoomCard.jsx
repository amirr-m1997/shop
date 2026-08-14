import { Link } from 'react-router-dom';
import { Lock, Mail, Package, Users } from 'lucide-react';
import { Avatar } from '../chat/ChatDomainComponents';
import { formatRelativeDate } from '../../lib/formatDate';
import RoomCover from './RoomCover';

export const RoomVisibilityBadge = ({ visibility }) => {
  const isInviteOnly = visibility === 'invite_only';
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
      {isInviteOnly ? <Mail className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {isInviteOnly ? 'فقط با دعوت' : 'خصوصی'}
    </span>
  );
};

export const RoomRoleBadge = ({ role }) => {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-0.5 text-[10px] font-black text-black shadow-sm">
        مالک
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
      عضو
    </span>
  );
};

export const RoomMetaChip = ({ icon: Icon, label, value }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground tabular-nums">
    <Icon className="h-3.5 w-3.5 text-amber-600/80 dark:text-amber-400/80" />
    {value.toLocaleString('fa-IR')}
    <span className="font-medium">{label}</span>
  </span>
);

const StyleRoomCard = ({ room }) => {
  const ownerName = room.owner?.display_name || room.owner?.username || 'کاربر';

  return (
    <Link
      to={`/style-rooms/${room.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`اتاق استایل ${room.title}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted/40">
        <RoomCover
          room={room}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <RoomVisibilityBadge visibility={room.visibility} />
        </div>
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar user={room.owner} size={30} ring={false} />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white drop-shadow">{ownerName}</p>
              <p className="text-[9px] text-white/70">{formatRelativeDate(room.updated_at)}</p>
            </div>
          </div>
          <RoomRoleBadge role={room.my_role} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-black text-foreground transition group-hover:text-amber-600 dark:group-hover:text-amber-400">
          {room.title}
        </h3>
        {room.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{room.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <RoomMetaChip icon={Users} label="عضو" value={room.member_count} />
          <RoomMetaChip icon={Package} label="محصول" value={room.item_count} />
        </div>
      </div>
    </Link>
  );
};

export default StyleRoomCard;