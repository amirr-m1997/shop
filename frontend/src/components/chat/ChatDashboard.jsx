import { Link } from 'react-router-dom';
import {
  ArrowRight, Ban, Check, Clock, Crown, Gift, Heart, Loader2, MessageCircle,
  MessageSquare, MoreVertical, RefreshCw, Search, Send, ShoppingBag, Smile,
  Trash2, User, UserCheck, Users, X,
} from 'lucide-react';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';
import { Avatar, EMOJIS, MessageBubble } from './ChatDomainComponents';
import ChatDialogs from './ChatDialogs';
import ConversationSidebar from './ConversationSidebar';

const ChatDashboard = ({ model }) => {
  const {
    activeId, messages, convLoading, text, setText, sending,
    mobilePane, setMobilePane, showEmoji,
    setShowEmoji, sendProductOpen, setSendProductOpen, profileOpen,
    setProfileOpen, sharedOpen, setSharedOpen, sharedProducts, sharedProductsCount, sharedProductsNextOffset, sharedProductsLoading, loadMoreSharedProducts, messagesEndRef, textareaRef,
    messagesScrollRef, handleMessagesScroll, hasOlder, loadingOlder, currentUserId, active, loadMessages,
    handleAcceptRequest, handleDeclineRequest, handleReopenRequest, handleCancelRequest,
    menuOpen, setMenuOpen, confirmDialog, askConfirm, closeConfirm, handleClearChat,
    handleBlock, handleUnblock, handleSend, insertEmoji,
    peerTyping = false, peerPresence = 'offline',
    replyTo, setReplyTo, threadQuery, setThreadQuery, threadHits,
    handleSearchHit,
    handleReply, handleForward, handleDeleteMessage, handleReportMessage, handleRetryMessage,
    forwardingMessage, setForwardingMessage, handleConfirmForward,
    filteredConversations = [],
  } = model;

  return (
    <div className="luxe-chat flex h-full w-full flex-col bg-background text-foreground" dir="rtl">
      {/* Full-bleed chat shell */}
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-1 overflow-hidden border-y border-border/50">

        <ConversationSidebar model={model} />
        {/* ═══ CENTER: Chat window ═══ */}
        <section
          className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} relative flex-1 flex-col sm:flex bg-background min-w-0`}
        >
          {active ? (
            <>
              {/* Chat header */}
              <div className="relative z-20 flex items-center justify-between gap-3 border-b border-border/50 bg-card px-3 py-3 sm:px-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-foreground transition active:scale-95"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(true);
                      if (window.innerWidth < 1024) setMobilePane('profile');
                    }}
                    className="flex min-w-0 items-center gap-3 text-start"
                  >
                    <Avatar user={active.other_user} size={44} online={peerPresence === 'online'} ring />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground transition group-hover:text-amber-600 dark:group-hover:text-amber-400">
                          {active.other_user?.display_name || active.other_user?.username}
                        </p>
                        {peerPresence === 'online' && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        )}
                      </div>
                      <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-medium ${peerTyping || peerPresence === 'online' ? 'text-emerald-600/85 dark:text-emerald-400/85' : 'text-muted-foreground'}`}>
                        <span>
                          {active.status !== 'accepted'
                            ? 'در انتظار پاسخ'
                            : peerTyping
                              ? 'در حال نوشتن...'
                              : peerPresence === 'online'
                                ? 'آنلاین'
                                : peerPresence === 'away'
                                  ? 'فعال اخیراً'
                                  : (active.other_user?.last_seen_at ? 'آخرین بازدید ثبت شده' : 'آفلاین')}
                        </span>
                        {sharedProducts.length > 0 && (
                          <span className="truncate text-muted-foreground">• {sharedProductsCount.toLocaleString('fa-IR')} محصول مشترک</span>
                        )}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {sharedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSharedOpen(true)}
                      title="محصولات اشتراک‌گذاری‌شده"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-2.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 active:scale-95"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="hidden xl:inline">محصولات</span>
                      <span className="tabular-nums">({sharedProductsCount.toLocaleString('fa-IR')})</span>
                    </button>
                  )}

                  {active.status === 'accepted' && (
                    <div className="relative hidden sm:block">
                      <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={threadQuery || ''}
                        onChange={(event) => setThreadQuery?.(event.target.value)}
                        placeholder="جستجو در پیام‌ها"
                        className="h-9 w-36 rounded-xl border border-border/60 bg-secondary/40 pe-3 ps-8 text-[11px] outline-none focus:border-amber-500/40"
                      />
                      {threadHits?.length > 0 && (
                        <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-64 overflow-y-auto rounded-xl border border-border/60 bg-popover p-1 text-[11px] shadow-xl">
                          {threadHits.map((hit) => (
                            <button
                              key={hit.id}
                              type="button"
                              onClick={() => handleSearchHit?.(hit)}
                              className="block w-full truncate rounded-lg px-2 py-1.5 text-start text-foreground hover:bg-muted"
                            >
                              {hit.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((v) => !v);
                      if (window.innerWidth < 1024) setMobilePane('profile');
                    }}
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                      profileOpen
                        ? 'border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        : 'border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    {profileOpen ? 'بستن پروفایل' : 'مشاهده پروفایل'}
                  </button>

                  {/* ═══ Three-dot menu: clear chat / block ═══ */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: 'پاک کردن گفتگو',
                                message: 'همه پیام‌های این گفتگو فقط برای شما پاک شوند؟',
                                confirm: 'پاک کردن',
                                danger: true,
                                onConfirm: handleClearChat,
                              })
                            }
                            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/60"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                            پاک کردن گفتگو
                          </button>
                          {active.blocked_by_me ? (
                            <button
                              type="button"
                              onClick={handleUnblock}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/10"
                            >
                              <UserCheck className="h-4 w-4" />
                              رفع بلاک
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'بلاک کاربر',
                                  message: `«${active.other_user?.display_name || active.other_user?.username}» بلاک شود؟ پس از بلاک، امکان ارسال و دریافت پیام از این کاربر وجود نخواهد داشت.`,
                                  confirm: 'بلاک',
                                  danger: true,
                                  onConfirm: handleBlock,
                                })
                              }
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/10"
                            >
                              <Ban className="h-4 w-4" />
                              بلاک کاربر
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesScrollRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-32 space-y-4 scrollbar-hide">
                {convLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 animate-fade-in-up">
                    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-2xl shadow-amber-500/10">
                      <Heart className="h-9 w-9" />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black ring-2 ring-background">
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="text-lg font-black text-foreground">شروع گفتگو با {active.other_user?.display_name || active.other_user?.username || 'هم‌گفتگو'}</p>
                    <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">
                      اولین پیام را بفرستید یا محصول موردعلاقه‌تان را به اشتراک بگذارید. برای شروع سریع، یکی از پیشنهادها را انتخاب کنید:
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      {[
                        'سلام! چطورید؟ 👋',
                        'این استایل برات چطوره؟ ✨',
                        'یه محصول جدید دیدم، بفرستم؟ 🛍️',
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSend(null, s)}
                          disabled={sending}
                          className="rounded-full border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendProductOpen(true)}
                      className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-95"
                    >
                      <Gift className="h-4 w-4" />
                      ارسال محصول به گفتگو
                    </button>
                  </div>
                ) : (
                  <>
                    {hasOlder && (
                      <div className="sticky top-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] font-bold text-muted-foreground shadow-sm backdrop-blur">
                        {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        پیام‌های قدیمی‌تر با اسکرول به بالا بارگذاری می‌شوند
                      </div>
                    )}
                    <div className="space-y-4">
                      {messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          isMine={m.sender_id === currentUserId}
                          onReply={handleReply}
                          onForward={handleForward}
                          onDelete={handleDeleteMessage}
                          onReport={handleReportMessage}
                          onRetry={handleRetryMessage}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                )}
              </div>

              {/* Composer or Pending Request Banner */}
              {active && active.status === 'pending' && !active.is_requester ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg lg:bottom-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">درخواست گفتگو جدید</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {active.other_user?.display_name || active.other_user?.username} مایل است با شما گفتگو کند.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-4 py-2.5 text-xs font-bold text-black shadow-md transition hover:brightness-110"
                    >
                      <Check className="h-4 w-4" />
                      پذیرفتن
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                      رد کردن
                    </button>
                  </div>
                </div>
              ) : active && active.status === 'pending' && active.is_requester ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl shadow-lg lg:bottom-0">
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span>درخواست گفتگو ارسال شده است. پس از تایید کاربر می‌توانید پیام بفرستید.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: 'لغو درخواست گفتگو',
                          message: `درخواست ارسال‌شده به ${active.other_user?.display_name || active.other_user?.username} لغو شود؟`,
                          confirm: 'لغو درخواست',
                          danger: true,
                          onConfirm: handleCancelRequest,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/50 px-3.5 py-2 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                      لغو درخواست
                    </button>
                  </div>
                </div>
              ) : active && active.status === 'declined' ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 sm:p-5 backdrop-blur-xl shadow-lg lg:bottom-0">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400">
                        <X className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">این درخواست گفتگو رد شده است</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {active.is_requester
                            ? 'اگر تمایل دارید، می‌توانید دوباره درخواست بدهید.'
                            : 'اگر تمایل دارید، می‌توانید با این کاربر گفتگو را شروع کنید.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleReopenRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-600/5 px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/20"
                    >
                      {active.is_requester ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          ارسال مجدد درخواست
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          شروع گفتگو
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : active && active.is_blocked ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl text-center shadow-lg lg:bottom-0">
                  <div className="flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm">
                    <Ban className="h-4 w-4" />
                    <span>
                      {active.blocked_by_me
                        ? 'شما این کاربر را بلاک کرده‌اید. برای گفتگو از منو «رفع بلاک» را انتخاب کنید.'
                        : 'این کاربر شما را بلاک کرده است.'}
                    </span>
                  </div>
                </div>
              ) : active ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/95 p-3 sm:p-4 backdrop-blur-xl shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] lg:bottom-0">
                  {showEmoji && (
                    <div className="absolute right-4 bottom-full mb-2 flex flex-wrap gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-2xl w-64 animate-scale-in">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-muted active:scale-90"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  {replyTo && (
                    <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          پاسخ به {replyTo.sender_name || replyTo.sender_username || 'پیام'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{replyTo.deleted_for_everyone ? 'پیام حذف شده' : replyTo.text}</p>
                      </div>
                      <button type="button" onClick={() => setReplyTo?.(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="لغو پاسخ">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex items-center gap-2 shrink-0 pb-1">
                      <button
                        type="button"
                        onClick={() => setShowEmoji((v) => !v)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${showEmoji ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendProductOpen(true)}
                        title="ارسال محصول"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-amber-600 active:scale-90 sm:hidden"
                      >
                        <Gift className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        rows={1}
                        maxLength={2000}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="peer w-full max-h-32 resize-none rounded-2xl border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>

                    {/* Send button — Telegram-style accent, on the leading side */}
                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      aria-label="ارسال پیام"
                      className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-md shadow-amber-500/30 transition hover:brightness-110 active:scale-90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:brightness-100"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -rotate-45" />}
                    </button>
                  </form>

                  <div className="mt-1 hidden sm:flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSendProductOpen(true)}
                      className="flex h-8 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 active:scale-95"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      ارسال محصول
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center animate-fade-in-up">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-2xl shadow-amber-500/10">
                <Crown className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">به استایل چت خوش آمدید</h3>
              <p className="mt-2.5 max-w-md text-sm text-muted-foreground leading-relaxed">
                با دوستان گفتگو کنید، ایده‌های استایل را رد و بدل کنید و محصولات موردعلاقه‌تان را به اشتراک بگذارید.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <span className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground">
                  <Search className="h-4 w-4 text-amber-500" />
                  نام کاربری دوست‌تان را جستجو کنید
                </span>
                <Link
                  to="/products"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110"
                >
                  <ShoppingBag className="h-4 w-4" />
                  کاوش محصولات
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ═══ RIGHT: Profile panel ═══ */}
        <aside
          className={`${
            mobilePane === 'profile' ? 'flex' : 'hidden'
          } ${profileOpen ? 'lg:flex' : 'lg:hidden'} w-full flex-col border-r border-border/50 bg-card/60 sm:w-[280px] lg:w-[300px] shrink-0`}
        >
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground leading-tight">
                      پروفایل {active.other_user?.display_name || active.other_user?.username}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                      کاربر مقابل — طرف گفتگو
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    if (window.innerWidth < 1024) setMobilePane('chat');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 scrollbar-hide">
                {/* Avatar hero */}
                <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                  <Avatar user={active.other_user} size={96} online ring />
                  <h2 className="mt-4 text-lg font-black text-foreground">
                    {active.other_user?.display_name || active.other_user?.username}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">@{active.other_user?.username}</p>
                  <p className="mt-1 text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">علاقه‌مند به مد و استایل</p>

                  <div className="mt-5 grid w-full grid-cols-3 gap-2">
                    {[
                      { label: 'گفتگو', value: '۱', Icon: MessageSquare },
                      { label: 'محصولات', value: messages.filter((m) => m.product).length.toLocaleString('fa-IR') || '۰', Icon: ShoppingBag },
                      { label: 'پیام‌ها', value: messages.length.toLocaleString('fa-IR') || '۰', Icon: Send },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-secondary/30 py-3 transition hover:border-amber-500/30 hover:bg-amber-500/5">
                        <s.Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-black text-foreground tabular-nums">{s.value}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style tags */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">ترجیحات استایل</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(active.other_user?.style_preferences?.length ? active.other_user.style_preferences : []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-600/90 dark:text-amber-400/90"
                      >
                        {tag}
                      </span>
                    ))}
                    {(!active.other_user?.style_preferences?.length) && (
                      <span className="text-[11px] text-muted-foreground">سبک موردعلاقه‌ای مشخص نشده است.</span>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">دسته‌های محبوب</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(active.other_user?.popular_categories?.length ? active.other_user.popular_categories : []).map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-bold text-emerald-600/90 dark:text-emerald-400/90"
                      >
                        {cat}
                      </span>
                    ))}
                    {(!active.other_user?.popular_categories?.length) && (
                      <span className="text-[11px] text-muted-foreground">دسته‌بندی از علاقه‌مندی‌ها محاسبه نشده است.</span>
                    )}
                  </div>
                </div>

                {/* Shared products in this chat */}
                {messages.some((m) => m.product) && (
                  <div className="px-5 pb-6">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-muted-foreground">محصولات اشتراک‌گذاری‌شده</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {messages
                        .filter((m) => m.product)
                        .slice(-6)
                        .reverse()
                        .map((m) => {
                          const img = m.product?.primary_image || PLACEHOLDER_IMG;
                          return (
                            <Link
                              key={m.id}
                              to={`/product/${m.product.slug}`}
                              className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/30 transition hover:border-amber-500/40"
                            >
                              <img src={img} alt={m.product.name} className="h-full w-full object-cover" loading="lazy" />
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="px-5 pb-8">
                  <Link
                    to="/products"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-600/5 py-3 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    کاوش محصولات
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">برای مشاهده پروفایل یک گفتگو انتخاب کنید</p>
            </div>
          )}
        </aside>
      </div>

      <ChatDialogs
        sendProductOpen={sendProductOpen}
        setSendProductOpen={setSendProductOpen}
        activeId={activeId}
        active={active}
        loadMessages={loadMessages}
        sharedOpen={sharedOpen}
        setSharedOpen={setSharedOpen}
        sharedProducts={sharedProducts}
        sharedProductsCount={sharedProductsCount}
        sharedProductsNextOffset={sharedProductsNextOffset}
        sharedProductsLoading={sharedProductsLoading}
        loadMoreSharedProducts={loadMoreSharedProducts}
        confirmDialog={confirmDialog}
        closeConfirm={closeConfirm}
        forwardingMessage={forwardingMessage}
        setForwardingMessage={setForwardingMessage}
        handleConfirmForward={handleConfirmForward}
        conversations={filteredConversations}
      />
    </div>
  );
};

export default ChatDashboard;
