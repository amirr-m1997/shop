import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock3, Gift, History, Loader2, LockKeyhole, Sparkles, Ticket, Truck, WalletCards, XCircle } from 'lucide-react';
import { loyaltyAPI } from '../../services/api';
import { formatPrice } from '../../lib/formatPrice';
import { Button } from '../ui/Button';
import { ErrorAlert, SectionCard, SectionHead, SuccessAlert } from './ProfilePrimitives';

const dateTime = (value) => value ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'بدون تاریخ انقضا';
const messageFor = (error, fallback) => error?.response?.data?.detail || error?.response?.data?.error || fallback;
const rewardValue = (reward) => {
  if (reward.reward_type === 'free_shipping') return 'ارسال رایگان';
  return reward.discount_type === 'percentage' ? `${reward.discount_value}% تخفیف` : `${formatPrice(reward.discount_value)} تخفیف`;
};

const CustomerClubSection = () => {
  const [summary, setSummary] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsNext, setTransactionsNext] = useState(null);
  const [referralSummary, setReferralSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemError, setRedeemError] = useState('');
  const [success, setSuccess] = useState(null);

  const loadClub = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, rewardsResponse, transactionsResponse, referralResponse] = await Promise.all([
        loyaltyAPI.getSummary(), loyaltyAPI.getRewards(), loyaltyAPI.getTransactions({ page: 1 }), loyaltyAPI.getReferralSummary(),
      ]);
      setSummary(summaryResponse.data || {});
      setRewards(Array.isArray(rewardsResponse.data?.rewards) ? rewardsResponse.data.rewards : []);
      setHistory(Array.isArray(rewardsResponse.data?.history) ? rewardsResponse.data.history : []);
      setTransactions(Array.isArray(transactionsResponse.data?.results) ? transactionsResponse.data.results : []);
      setTransactionsNext(transactionsResponse.data?.next || null);
      setReferralSummary(referralResponse.data || {});
    } catch (loadError) {
      setError(messageFor(loadError, 'اطلاعات باشگاه مشتریان بارگذاری نشد.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClub(); }, [loadClub]);

  const loadMoreTransactions = async () => {
    if (!transactionsNext) return;
    const nextPage = new URL(transactionsNext, window.location.origin).searchParams.get('page');
    if (!nextPage) return;
    try {
      const response = await loyaltyAPI.getTransactions({ page: nextPage });
      setTransactions((current) => [...current, ...(response.data?.results || [])]);
      setTransactionsNext(response.data?.next || null);
    } catch (loadError) {
      setError(messageFor(loadError, 'فعالیت‌های امتیازی بیشتر بارگذاری نشد.'));
    }
  };

  const availablePoints = Number(summary?.available_points || 0);
  const redeem = async (reward) => {
    if (redeemingId || availablePoints < Number(reward.points_required || 0)) return;
    if (!window.confirm(`آیا می‌خواهید «${reward.name}» را با ${Number(reward.points_required).toLocaleString()} امتیاز دریافت کنید؟`)) return;
    setRedeemingId(reward.id);
    setRedeemError('');
    setSuccess(null);
    try {
      const key = `profile-reward-${reward.id}-${Date.now()}`;
      const response = await loyaltyAPI.redeemReward(reward.id, key);
      setSuccess({ name: reward.name, code: response.data?.redemption_code || '' });
      await loadClub();
    } catch (redeemFailure) {
      setRedeemError(messageFor(redeemFailure, 'دریافت این پاداش امکان‌پذیر نیست.'));
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <SectionCard dir="rtl" className="border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-card/80 to-violet-500/[0.05]" delay={0.04}>
      <SectionHead icon={Gift} title="باشگاه مشتریان" />
      <div className="space-y-6 p-5 sm:p-6">
        {loading ? <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/50 p-5 text-sm text-muted-foreground" role="status"><Loader2 className="h-5 w-5 animate-spin text-amber-500" />در حال بارگذاری امتیازهای شما…</div> : error ? <div className="space-y-3"><ErrorAlert>{error}</ErrorAlert><Button type="button" variant="outline" onClick={loadClub}>تلاش دوباره</Button></div> : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['امتیاز قابل استفاده', summary?.available_points, WalletCards, 'text-amber-600 dark:text-amber-400'],
                ['مجموع امتیاز کسب‌شده', summary?.total_earned, Sparkles, 'text-emerald-600 dark:text-emerald-400'],
                ['مجموع امتیاز مصرف‌شده', summary?.total_redeemed, History, 'text-violet-600 dark:text-violet-400'],
              ].map(([label, value, Icon, accent]) => <div key={label} className="rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm"><Icon className={`mb-3 h-5 w-5 ${accent}`} /><p className="text-2xl font-black tabular-nums text-foreground">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div>)}
            </div>

            {success && <SuccessAlert><span className="flex flex-wrap items-center gap-2">پاداش دریافت شد: {success.name}.{success.code && <code className="rounded bg-emerald-500/10 px-2 py-1 font-bold" dir="ltr">{success.code}</code>}</span></SuccessAlert>}
            {redeemError && <ErrorAlert>{redeemError}</ErrorAlert>}

            <div>
              <div className="mb-3 flex items-center gap-2"><History className="h-5 w-5 text-emerald-500" /><div><h3 className="text-base font-black text-foreground">فعالیت‌های امتیازی</h3><p className="mt-1 text-xs text-muted-foreground">آخرین امتیازهای کسب‌شده و مصرف‌شده</p></div></div>
              {transactions.length === 0 ? <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">هنوز فعالیت امتیازی ثبت نشده است.</div> : <div className="space-y-2">{transactions.map((entry) => <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/55 p-3"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${entry.points_delta > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-violet-500/10 text-violet-600'}`}>{entry.points_delta > 0 ? <Sparkles className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="font-bold text-foreground">{entry.event?.name || entry.entry_type}</p><p className="mt-0.5 text-xs text-muted-foreground">{entry.description || 'فعالیت امتیازی'} · {dateTime(entry.created_at)}</p>{(entry.order_reference || entry.product_reference) && <p className="mt-1 truncate text-xs text-muted-foreground">{entry.order_reference?.order_number || entry.product_reference?.name}</p>}</div><span className={`shrink-0 text-sm font-black ${entry.points_delta > 0 ? 'text-emerald-600' : 'text-violet-600'}`}>{entry.points_delta > 0 ? '+' : ''}{Number(entry.points_delta).toLocaleString()}</span></div>)}</div>}
              {transactionsNext && <Button type="button" variant="outline" onClick={loadMoreTransactions} className="mt-3 w-full rounded-xl">نمایش فعالیت‌های بیشتر</Button>}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2"><Gift className="h-5 w-5 text-blue-500" /><div><h3 className="text-base font-black text-foreground">وضعیت دعوت دوستان</h3><p className="mt-1 text-xs text-muted-foreground">فعالیت‌های دعوت شما</p></div></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['تعداد فعالیت', referralSummary?.total_activity], ['دعوت‌های موفق', referralSummary?.successful_referrals], ['کاربران دعوت‌شده', referralSummary?.referred_users], ['امتیاز کسب‌شده', referralSummary?.referral_rewards_earned]].map(([label, value]) => <div key={label} className="rounded-2xl border border-border/50 bg-background/50 p-3"><p className="text-lg font-black tabular-nums text-foreground">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-[11px] font-semibold text-muted-foreground">{label}</p></div>)}</div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between"><div><h3 className="text-base font-black text-foreground">پاداش‌های قابل دریافت</h3><p className="mt-1 text-xs text-muted-foreground">از امتیازهای خود برای دریافت پاداش استفاده کنید.</p></div><Ticket className="h-5 w-5 text-amber-500" /></div>
              {rewards.length === 0 ? <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">در حال حاضر پاداشی برای دریافت وجود ندارد.</div> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{rewards.map((reward) => {
                const insufficient = availablePoints < Number(reward.points_required || 0);
                const busy = redeemingId === reward.id;
                return <div key={reward.id} className={`rounded-2xl border p-4 shadow-sm ${insufficient ? 'border-border/40 bg-muted/30' : 'border-amber-500/25 bg-background/65'}`}>
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-foreground">{reward.name}</h4><p className="mt-1 text-sm font-black text-amber-600 dark:text-amber-400">{rewardValue(reward)}</p></div>{reward.reward_type === 'free_shipping' ? <Truck className="h-5 w-5 shrink-0 text-amber-500" /> : <Ticket className="h-5 w-5 shrink-0 text-amber-500" />}</div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground"><p>{Number(reward.points_required).toLocaleString()} امتیاز موردنیاز</p>{reward.minimum_order_value && <p>حداقل مبلغ سفارش: {formatPrice(reward.minimum_order_value)}</p>}<p className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />معتبر تا: {dateTime(reward.ends_at)}</p></div>
                  <Button type="button" onClick={() => redeem(reward)} disabled={insufficient || Boolean(redeemingId)} className="mt-4 w-full rounded-xl font-bold">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{insufficient ? <><LockKeyhole className="h-4 w-4" />امتیاز کافی نیست</> : 'دریافت پاداش'}</Button>
                </div>;
              })}</div>}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2"><History className="h-5 w-5 text-violet-500" /><div><h3 className="text-base font-black text-foreground">تاریخچه دریافت پاداش</h3><p className="mt-1 text-xs text-muted-foreground">امتیازهای مصرف‌شده برای پاداش‌ها</p></div></div>
              {history.length === 0 ? <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">تاریخچه دریافت پاداش‌های شما در اینجا نمایش داده می‌شود.</div> : <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{history.map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/55 p-3">{entry.status === 'available' ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" /> : <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{entry.rule_name || 'پاداش امتیازی'}</p><p className="mt-0.5 text-xs text-muted-foreground">{dateTime(entry.redeemed_at)} · {entry.status}</p></div><span className="shrink-0 text-sm font-black text-violet-600 dark:text-violet-400">−{Number(entry.points_cost || 0).toLocaleString()}</span></div>)}</div>}
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/45 p-4 text-xs text-muted-foreground"><p className="font-bold text-foreground">خلاصه وضعیت دعوت دوستان</p><p className="mt-1">{Object.entries(referralSummary?.status_counts || {}).map(([status, count]) => `${status}: ${count}`).join(' · ') || 'هنوز فعالیتی در بخش دعوت دوستان ثبت نشده است.'}</p></div>
          </>
        )}
      </div>
    </SectionCard>
  );
};

export default CustomerClubSection;
