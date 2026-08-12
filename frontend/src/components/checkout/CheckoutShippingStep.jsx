import { AlertCircle, ArrowLeft, ArrowRight, Check, Home, Mail, MapPin, Phone, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import Skeleton from '../ui/Skeleton';
import { Badge } from '../ui/Badge';

const CheckoutShippingStep = ({
  step, error, addrLoading, isAuthenticated, guestEmailError, guestInfo,
  handleGuestInfoChange, newAddress, handleAddressChange, shippingAddresses,
  showAddressForm, selectedAddress, setSelectedAddress, setShowAddressForm,
  setError, handleAddAddress, setStep, validateAndContinue,
}) => (
  <>
{/* ── Step 2: Shipping ── */}
            {step === 2 && (
              <Card className="overflow-hidden border shadow-sm">
                <div className="px-5 sm:px-6 py-4 border-b bg-gradient-to-l from-blue-500/5 to-transparent flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">آدرس ارسال</h2>
                    <p className="text-xs text-muted-foreground">محل تحویل سفارش را انتخاب کنید</p>
                  </div>
                </div>
                <CardContent className="p-5 sm:p-6">
                  {error && (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-xl mb-4 text-sm">
                      {error}
                    </div>
                  )}

                  {addrLoading ? (
                    <div className="space-y-3 py-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5 rounded-lg" />
                            <Skeleton className="h-4 w-32 rounded-lg" />
                          </div>
                          <Skeleton className="h-3 w-full rounded" />
                          <Skeleton className="h-3 w-3/4 rounded" delay={0.05} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {!isAuthenticated && (
                        <>
                          {/* ── اطلاعات تماس ── */}
                          <div className="mb-5 overflow-hidden rounded-2xl border bg-muted/20">
                            <div className="flex items-center gap-2.5 border-b bg-gradient-to-l from-primary/[0.05] to-transparent px-4 py-3.5 sm:px-5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                                <Mail className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold">اطلاعات تماس</h3>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  ایمیل، تنها راه ارتباطی ما با شماست؛ آن را کاملاً دقیق وارد کنید.
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3.5 p-4 sm:p-5">
                              {guestEmailError && (
                                <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                                  <span className="mt-0.5 shrink-0">⚠</span>
                                  لطفاً ایمیل را با دقت وارد کنید — پیگیری سفارش و فاکتور به همین ایمیل ارسال می‌شود.
                                </div>
                              )}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label htmlFor="guest-email" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    ایمیل <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="guest-email"
                                    name="email"
                                    type="email"
                                    dir="ltr"
                                    placeholder="example@mail.com"
                                    value={guestInfo.email}
                                    onChange={handleGuestInfoChange}
                                    aria-invalid={!!guestEmailError}
                                    className={`rounded-xl text-left ${guestEmailError ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
                                  />
                                  {guestEmailError && (
                                    <p className="mt-1.5 flex items-start gap-1 text-xs text-destructive">
                                      <span className="mt-0.5 shrink-0">⚠</span>
                                      {guestEmailError}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <label htmlFor="guest-phone" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    شماره تماس <span className="text-muted-foreground/60">(اختیاری)</span>
                                  </label>
                                  <Input
                                    id="guest-phone"
                                    name="phone"
                                    dir="ltr"
                                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                    value={guestInfo.phone}
                                    onChange={handleGuestInfoChange}
                                    className="rounded-xl text-left"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── آدرس ارسال ── */}
                          <div className="mb-5 overflow-hidden rounded-2xl border bg-muted/20">
                            <div className="flex items-center gap-2.5 border-b bg-gradient-to-l from-blue-500/[0.05] to-transparent px-4 py-3.5 sm:px-5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/10">
                                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-bold">آدرس ارسال</h3>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  محل تحویل سفارش را وارد کنید.
                                </p>
                              </div>
                            </div>
                            <div className="p-4 sm:p-5">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <label htmlFor="addr-fullname" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    نام و نام خانوادگی <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="addr-fullname"
                                    name="full_name"
                                    placeholder="مثلاً علی محمدی"
                                    value={newAddress.full_name}
                                    onChange={handleAddressChange}
                                    className="rounded-xl"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="addr-phone" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    شماره تماس گیرنده
                                  </label>
                                  <Input
                                    id="addr-phone"
                                    name="phone"
                                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                    value={newAddress.phone}
                                    onChange={handleAddressChange}
                                    dir="ltr"
                                    className="rounded-xl text-left"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="addr-postal" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    کد پستی <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="addr-postal"
                                    name="postal_code"
                                    placeholder="۱۰ رقم"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={newAddress.postal_code}
                                    onChange={handleAddressChange}
                                    dir="ltr"
                                    className="rounded-xl text-left"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="addr-state" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    استان
                                  </label>
                                  <Input
                                    id="addr-state"
                                    name="state"
                                    placeholder="مثلاً تهران"
                                    value={newAddress.state}
                                    onChange={handleAddressChange}
                                    className="rounded-xl"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="addr-city" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    شهر <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="addr-city"
                                    name="city"
                                    placeholder="مثلاً تهران"
                                    value={newAddress.city}
                                    onChange={handleAddressChange}
                                    className="rounded-xl"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label htmlFor="addr-line1" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    آدرس اصلی <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    id="addr-line1"
                                    name="address_line1"
                                    placeholder="خیابان، کوچه، پلاک"
                                    value={newAddress.address_line1}
                                    onChange={handleAddressChange}
                                    className="rounded-xl"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label htmlFor="addr-line2" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                    آدرس تکمیلی <span className="text-muted-foreground/60">(اختیاری)</span>
                                  </label>
                                  <Input
                                    id="addr-line2"
                                    name="address_line2"
                                    placeholder="واحد، طبقه"
                                    value={newAddress.address_line2}
                                    onChange={handleAddressChange}
                                    className="rounded-xl"
                                  />
                                </div>
                                <p className="-mt-0.5 text-[11px] text-muted-foreground sm:col-span-2">
                                  کد پستی ۱۰ رقمی اجباری است.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {isAuthenticated && shippingAddresses.length === 0 && showAddressForm && (
                        <div className="mb-5 rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-primary/[0.04] via-card to-muted/20 px-4 py-5 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/10">
                            <MapPin className="h-5 w-5 text-primary/70" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-bold">اولین آدرس ارسال را ثبت کنید</p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            برای تحویل سفارش، آدرس معتبر خود را ثبت کنید.
                          </p>
                        </div>
                      )}

                      {isAuthenticated && shippingAddresses.length > 0 && (
                        <div className="space-y-3 mb-5">
                          {shippingAddresses.map((address) => {
                            const selected = selectedAddress === address.id;
                            return (
                              <button
                                type="button"
                                key={address.id}
                                onClick={() => setSelectedAddress(address.id)}
                                className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${
                                  selected
                                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                                    : 'border-border hover:border-primary/30 hover:bg-muted/40'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                                    }`}
                                  >
                                    {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-bold text-sm">{address.full_name}</p>
                                      {address.is_default && (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                          پیش‌فرض
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {address.phone}
                                    </p>
                                    <p className="text-sm mt-1.5 leading-relaxed flex items-start gap-1">
                                      <Home className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                      <span>
                                        {address.address_line1}
                                        {address.address_line2 && `، ${address.address_line2}`}
                                        {(address.city || address.state) && (
                                          <>
                                            <br />
                                            {[address.city, address.state].filter(Boolean).join('، ')}
                                            {address.postal_code && ` — کد پستی: ${address.postal_code}`}
                                          </>
                                        )}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isAuthenticated && !showAddressForm ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl border-dashed h-11 mb-5"
                          onClick={() => setShowAddressForm(true)}
                        >
                          <Plus className="ml-2 h-4 w-4" />
                          افزودن آدرس جدید
                        </Button>
                      ) : isAuthenticated ? (
                        <div className="overflow-hidden rounded-2xl border bg-muted/20 mb-5">
                          <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              آدرس جدید
                            </h3>
                            {shippingAddresses.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setShowAddressForm(false);
                                  setError('');
                                }}
                              >
                                بستن
                              </button>
                            )}
                          </div>
                          <form onSubmit={handleAddAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5">
                            <div className="sm:col-span-2">
                              <label htmlFor="addr-new-fullname" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                نام و نام خانوادگی <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="addr-new-fullname"
                                name="full_name"
                                placeholder="مثلاً علی محمدی"
                                value={newAddress.full_name}
                                onChange={handleAddressChange}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <label htmlFor="addr-new-phone" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                شماره تماس <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="addr-new-phone"
                                name="phone"
                                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                                value={newAddress.phone}
                                onChange={handleAddressChange}
                                dir="ltr"
                                className="rounded-xl text-left"
                              />
                            </div>
                            <div>
                              <label htmlFor="addr-new-postal" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                کد پستی
                              </label>
                              <Input
                                id="addr-new-postal"
                                name="postal_code"
                                placeholder="۱۰ رقم"
                                inputMode="numeric"
                                maxLength={10}
                                value={newAddress.postal_code}
                                onChange={handleAddressChange}
                                dir="ltr"
                                className="rounded-xl text-left"
                              />
                            </div>
                            <div>
                              <label htmlFor="addr-new-state" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                استان
                              </label>
                              <Input
                                id="addr-new-state"
                                name="state"
                                placeholder="مثلاً تهران"
                                value={newAddress.state}
                                onChange={handleAddressChange}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <label htmlFor="addr-new-city" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                شهر <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="addr-new-city"
                                name="city"
                                placeholder="مثلاً تهران"
                                value={newAddress.city}
                                onChange={handleAddressChange}
                                className="rounded-xl"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="addr-new-line1" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                آدرس اصلی <span className="text-destructive">*</span>
                              </label>
                              <Input
                                id="addr-new-line1"
                                name="address_line1"
                                placeholder="خیابان، کوچه، پلاک"
                                value={newAddress.address_line1}
                                onChange={handleAddressChange}
                                className="rounded-xl"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label htmlFor="addr-new-line2" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                آدرس تکمیلی <span className="text-muted-foreground/60">(اختیاری)</span>
                              </label>
                              <Input
                                id="addr-new-line2"
                                name="address_line2"
                                placeholder="واحد، طبقه"
                                value={newAddress.address_line2}
                                onChange={handleAddressChange}
                                className="rounded-xl"
                              />
                            </div>
                            <Button type="submit" className="sm:col-span-2 rounded-xl mt-1">
                              ذخیره آدرس
                            </Button>
                          </form>
                        </div>
                      ) : null}

                      <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl sm:w-auto"
                          onClick={() => setStep(1)}
                        >
                          <ArrowRight className="ml-2 h-4 w-4" />
                          بازگشت
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 rounded-xl h-12 font-bold shadow-md"
                          onClick={validateAndContinue}
                          disabled={isAuthenticated && !selectedAddress}
                        >
                          ادامه — روش پرداخت
                          <ArrowLeft className="mr-2 h-5 w-5" />
                        </Button>
                      </div>
                      {error && step === 2 && (
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          {error}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
  </>
);

export default CheckoutShippingStep;
