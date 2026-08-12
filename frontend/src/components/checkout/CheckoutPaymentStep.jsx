import { AlertCircle, ArrowRight, Check, Loader2, MapPin, Wallet } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { formatPrice } from '../../lib/formatPrice';
import { PAYMENT_METHODS } from './constants';

const CheckoutPaymentStep = ({
  step, error, selectedAddrObj, setStep, paymentMethod, setPaymentMethod,
  orderNotes, setOrderNotes, finalTotal, isSubmitting, loading, handlePlaceOrder,
}) => (
  <>
{/* ── Step 3: Payment ── */}
            {step === 3 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-violet-500/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">روش پرداخت</h2>
                    <p className="text-xs text-muted-foreground">نحوه پرداخت را انتخاب کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  {error && (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Selected address recap */}
                  {selectedAddrObj && (
                    <div className="rounded-2xl border bg-muted/30 p-4 mb-5 flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground font-medium">ارسال به</p>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setStep(2)}
                          >
                            تغییر
                          </button>
                        </div>
                        <p className="font-semibold text-sm mt-0.5">{selectedAddrObj.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {selectedAddrObj.address_line1}
                          {selectedAddrObj.city && ` — ${selectedAddrObj.city}`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => {
                      const Icon = method.icon;
                      const selected = paymentMethod === method.id;
                      return (
                        <button
                          type="button"
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`w-full text-right p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                            selected
                              ? `bg-gradient-to-l ${method.accent} shadow-sm`
                              : 'border-border hover:border-primary/30 hover:bg-muted/40'
                          }`}
                        >
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${method.iconBg}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm sm:text-base">{method.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                            }`}
                          >
                            {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <label className="block text-sm font-medium mb-2">یادداشت سفارش (اختیاری)</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      placeholder="توضیحی درباره سفارش خود بنویسید"
                    />
                  </div>

                  {/* Pay amount highlight */}
                  <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">مبلغ نهایی</span>
                    <span className="text-xl font-bold tabular-nums text-primary">
                      {formatPrice(finalTotal > 0 ? finalTotal : 0)}
                    </span>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="rounded-xl sm:w-auto"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                      بازگشت
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 rounded-xl h-12 font-bold shadow-md hover:shadow-lg transition-all"
                      onClick={handlePlaceOrder}
                      disabled={loading}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                          در حال انتقال...
                        </>
                      ) : (
                        <>
                          <Check className="ml-2 h-5 w-5" />
                          ثبت نهایی سفارش
                        </>
                      )}
                    </Button>
                  </div>
                  {error && step === 3 && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
  </>
);

export default CheckoutPaymentStep;
