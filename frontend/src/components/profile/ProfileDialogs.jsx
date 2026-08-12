import { AlertTriangle, LogOut, MapPin } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../ui/Dialog';

const ErrorAlert = ({ children }) => (
  <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-in">
    {children}
  </div>
);

const ProfileDialogs = ({
  deleteAddrOpen, setDeleteAddrOpen, setDeleteAddrId, confirmDeleteAddress,
  logoutOpen, setLogoutOpen, handleLogout, showAddrForm, setShowAddrForm,
  editingAddr, addrErr, handleAddressSubmit, addrForm, setAddrForm, inputClass, resetAddrForm,
}) => (
  <>
      {/* ── Delete Address Dialog ── */}
      <Dialog open={deleteAddrOpen} onOpenChange={setDeleteAddrOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              حذف آدرس
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              آیا مطمئن هستید که می‌خواهید این آدرس را حذف کنید؟ این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={confirmDeleteAddress} className="rounded-xl font-bold">
              بله، حذف شود
            </Button>
            <Button
              variant="outline"
              onClick={() => { setDeleteAddrOpen(false); setDeleteAddrId(null); }}
              className="rounded-xl"
            >
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Logout Dialog ── */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              خروج از حساب
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={handleLogout} className="rounded-xl font-bold">
              بله، خارج شوم
            </Button>
            <Button variant="outline" onClick={() => setLogoutOpen(false)} className="rounded-xl">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Address Form Dialog ── */}
      <Dialog open={showAddrForm} onOpenChange={setShowAddrForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border/50 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              {editingAddr ? 'ویرایش آدرس' : 'افزودن آدرس جدید'}
            </DialogTitle>
          </DialogHeader>
          {addrErr && <ErrorAlert>{addrErr}</ErrorAlert>}
          <form onSubmit={handleAddressSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="نام و نام خانوادگی *"
                value={addrForm.full_name}
                onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })}
                required
                className={inputClass}
              />
              <Input
                placeholder="شماره تماس *"
                value={addrForm.phone}
                onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                required
                dir="ltr"
                className={inputClass}
              />
            </div>
            <Input
              placeholder="آدرس اصلی (خیابان، کوچه، پلاک) *"
              value={addrForm.address_line1}
              onChange={(e) => setAddrForm({ ...addrForm, address_line1: e.target.value })}
              required
              className={inputClass}
            />
            <Input
              placeholder="آدرس تکمیلی (واحد، طبقه)"
              value={addrForm.address_line2}
              onChange={(e) => setAddrForm({ ...addrForm, address_line2: e.target.value })}
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="شهر *"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                required
                className={inputClass}
              />
              <Input
                placeholder="استان"
                value={addrForm.state}
                onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                className={inputClass}
              />
            </div>
            <Input
              placeholder="کد پستی"
              value={addrForm.postal_code}
              onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })}
              dir="ltr"
              className={inputClass}
            />
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-3 transition-colors hover:bg-muted/40">
              <input
                type="checkbox"
                checked={addrForm.is_default}
                onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">تنظیم به عنوان آدرس پیش‌فرض</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="h-11 flex-1 rounded-xl font-bold shadow-md shadow-primary/15">
                {editingAddr ? 'ذخیره تغییرات' : 'افزودن آدرس'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => { setShowAddrForm(false); resetAddrForm(); }}
              >
                انصراف
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  </>
);

export default ProfileDialogs;

