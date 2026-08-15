import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ChatModeNavigation from './ChatModeNavigation';

export default function ChatWorkspace() {
  const { user } = useAuth();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background" dir="rtl" data-testid="chat-workspace">
      <div data-testid="chat-mode-navigation-bar" className="mx-auto flex w-full max-w-[1600px] flex-none justify-start border-x border-b border-border/50 bg-card">
        <ChatModeNavigation user={user} className="w-full md:w-[360px]" />
      </div>
      <div data-testid="chat-mode-content" className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden border-x border-border/50">
        <Outlet />
      </div>
    </div>
  );
}
