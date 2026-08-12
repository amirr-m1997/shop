import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';
import ResponsiveImage from '../ui/ResponsiveImage';

const CheckoutReviewStep = ({ step, cart, setStep }) => (
  <>
{/* ── Step 1: Review ── */}
            {step === 1 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-primary/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">بررسی سفارش</h2>
                    <p className="text-xs text-muted-foreground">محصولات سبد خود را مرور کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  <div className="space-y-3">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-3 sm:p-4 rounded-2xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all"
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 shrink-0">
                          <ResponsiveImage
                            src={item.product.primary_image || PLACEHOLDER_IMG}
                            alt={item.product.name}
                            widths={[320]}
                            sizes="(min-width: 640px) 96px, 80px"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                            {item.product.name}
                          </h3>
                          {item.variant && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <span className="text-xs px-2 py-0.5 rounded-md bg-secondary font-medium">
                                سایز: {item.variant.size_name}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-secondary font-medium">
                                رنگ: {item.variant.color_name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              تعداد: {item.quantity.toLocaleString('fa-IR')}
                            </span>
                            <span className="font-bold tabular-nums">{formatPrice(item.total_price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-6 rounded-xl h-12 font-bold shadow-md hover:shadow-lg transition-all"
                    onClick={() => setStep(2)}
                  >
                    ادامه — آدرس ارسال
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )}
  </>
);

export default CheckoutReviewStep;
