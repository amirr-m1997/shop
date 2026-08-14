import { MessageCircle, Shirt } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ChatModeNavigation = ({ className = '' }) => (
  <nav aria-label="Chat modes" className={`flex gap-1 rounded-2xl border border-border/50 bg-secondary/30 p-1 ${className}`}>
    <NavLink
      to="/chat"
      end
      aria-label="Private chat"
      className={({ isActive }) => `flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${isActive ? 'bg-card text-amber-700 shadow-sm ring-1 ring-amber-500/25 dark:text-amber-300' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
    >
      <MessageCircle className="h-4 w-4" />
      <span>گفت‌وگوی خصوصی</span>
    </NavLink>
    <NavLink
      to="/style-rooms"
      aria-label="Style Rooms"
      className={({ isActive }) => `flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${isActive ? 'bg-card text-amber-700 shadow-sm ring-1 ring-amber-500/25 dark:text-amber-300' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'}`}
    >
      <Shirt className="h-4 w-4" />
      <span>اتاق‌های استایل</span>
    </NavLink>
  </nav>
);

export default ChatModeNavigation;
