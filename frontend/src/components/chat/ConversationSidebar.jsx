import { Crown, Loader2, MessageSquare, Search, X } from 'lucide-react';
import { formatRelativeDate } from '../../lib/formatDate';
import Skeleton from '../ui/Skeleton';
import { Avatar } from './ChatDomainComponents';

const ConversationSidebar = ({ model }) => {
  const {
    conversations, activeId, loading, query, setQuery, searchResults,
    setSearchResults, searching, mobilePane, filter, setFilter,
    handleStartRequest, filteredConversations, selectConversation,
  } = model;

  return (
<aside
          className={`${mobilePane === 'list' ? 'flex' : 'hidden'} w-full flex-col border-l border-border/50 bg-card/60 sm:flex sm:w-[320px] lg:w-[360px] sm:shrink-0`}
        >
          {/* Brand + search header */}
          <div className="border-b border-border/50 px-4 pt-5 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-700 text-black shadow-lg shadow-amber-500/20">
                  <Crown className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="bg-gradient-to-l from-amber-600 to-yellow-600 bg-clip-text text-sm font-black tracking-wide text-transparent dark:from-amber-400 dark:to-yellow-500">استایل چت</h1>
                  <p className="mt-0.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Luxe · Style · Talk</p>
                </div>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/15 px-2 text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {conversations.length}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی نام کاربری..."
                className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pe-3 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-secondary/30 p-1">
              {[
                { id: 'all', label: 'همه' },
                { id: 'friends', label: 'دوستان' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    filter === t.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/10 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search results */}
          {query.trim() && (
            <div className="border-b border-border/50 px-3 py-2 max-h-56 overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-500" />
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">کاربری یافت نشد</p>
              )}
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleStartRequest(r)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition hover:bg-amber-500/10"
                >
                  <Avatar user={r} size={40} online />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{r.display_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground" dir="ltr">@{r.username}</p>
                  </div>
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {r.conversation_status === 'accepted' ? 'گفتگو' : r.conversation_status === 'pending' ? 'در انتظار' : 'شروع گفتگو'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2 scrollbar-hide">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-2.5 w-36 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <p className="text-sm font-extrabold text-foreground">هنوز گفتگویی ندارید</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  نام کاربری دوستتان را جستجو کنید یا محصولی را برایشان بفرستید.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === Number(activeId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl p-3 text-start transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-gradient-to-l from-amber-500/15 to-amber-500/5 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/25'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-amber-500 to-yellow-600" />
                    )}
                    <Avatar user={c.other_user} size={50} online={isActive && c.status === 'accepted'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm font-bold ${isActive ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                          {c.other_user?.display_name || c.other_user?.username}
                        </p>
                        {c.last_message && (
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground" dir="ltr">
                            {formatRelativeDate(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className={`truncate text-xs ${c.unread_count > 0 && c.status === 'accepted' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                          {c.status === 'pending'
                            ? (c.is_requester ? '⏳ در انتظار تایید کاربر' : '📩 درخواست گفتگو جدید!')
                            : c.status === 'declined'
                            ? '🚫 درخواست رد شده'
                            : c.last_message?.has_product
                            ? '📦 ارسال یک محصول'
                            : c.last_message?.text || 'شروع گفتگو...'}
                        </p>
                        {c.status === 'pending' && !c.is_requester && (
                          <span className="flex h-5 items-center justify-center rounded-full bg-emerald-500/20 px-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-pulse">
                            درخواست
                          </span>
                        )}
                        {c.unread_count > 0 && c.status === 'accepted' && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-1.5 text-[10px] font-black text-black shadow-sm shadow-amber-500/30">
                            {c.unread_count > 99 ? '۹۹+' : c.unread_count.toLocaleString('fa-IR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
  );
};

export default ConversationSidebar;

