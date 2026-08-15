import { Headphones, MessageCircle, Shirt } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const ChatModeNavigation = ({ className = '', user = null }) => {
  const location = useLocation();
  const isStaff = ['support_agent', 'fashion_stylist'].includes(user?.role);
  const linkClass = (active) => `flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${active ? 'bg-card text-amber-700 shadow-sm ring-1 ring-amber-500/25 dark:text-amber-300' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'}`;

  return (
    <nav aria-label="Chat modes" className={`flex flex-nowrap gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-secondary/30 p-1 ${className}`}>
      <NavLink to="/chat" end aria-label="Private chat" className={({ isActive }) => linkClass(isActive)}>
        <MessageCircle className="h-4 w-4" />
        <span>گفت‌وگوها</span>
      </NavLink>
      <NavLink to="/style-rooms" aria-label="Style Rooms" className={({ isActive }) => linkClass(isActive)}>
        <Shirt className="h-4 w-4" />
        <span>اتاق‌های استایل</span>
      </NavLink>
      <NavLink to="/support" aria-label="Stylist and Support" className={({ isActive }) => linkClass(isActive && !location.pathname.startsWith('/support/inbox'))}>
        <Headphones className="h-4 w-4" />
        <span>استایلیست / پشتیبانی</span>
      </NavLink>
      {isStaff && (
        <NavLink to="/support/inbox" aria-label="Support Inbox" className={({ isActive }) => linkClass(isActive)}>
          <Headphones className="h-4 w-4" />
          <span>Support Inbox</span>
        </NavLink>
      )}
    </nav>
  );
};

export default ChatModeNavigation;
