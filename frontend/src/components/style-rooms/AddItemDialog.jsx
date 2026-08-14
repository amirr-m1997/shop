import { useEffect, useRef, useState } from 'react';
import { Loader2, PackagePlus, Plus, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/use-toast';
import { productsAPI } from '../../services/api';
import { useAddStyleRoomItem } from '../../queries/styleRoomQueries';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const AddItemDialog = ({ open, onOpenChange, roomId, addItem: addItemProp }) => {
  const { toast } = useToast();
  const defaultAddItem = useAddStyleRoomItem(roomId);
  const addItem = addItemProp || defaultAddItem;
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const addingRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setProducts([]);
    setAddingId(null);
    addingRef.current = null;
    setLoading(true);
    productsAPI
      .getProducts({ page_size: 12, is_active: true })
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) return;
    const timer = setTimeout(() => {
      setLoading(true);
      productsAPI
        .getProducts({ search: query.trim(), page_size: 12 })
        .then((res) => {
          const data = res.data?.results || res.data || [];
          setProducts(Array.isArray(data) ? data : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, open]);

  const handleAdd = (product) => {
    if (addingRef.current || addItem.isPending) return;
    addingRef.current = product.id;
    setAddingId(product.id);
    addItem.mutate(product.id, {
      onSuccess: () => {
        toast({ title: 'افزوده شد', description: `«${product.name}» به اتاق اضافه شد.` });
        onOpenChange(false);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'افزودن محصول ممکن نشد.';
        toast({ title: 'خطا', description: message, variant: 'destructive' });
      },
      onSettled: () => {
        addingRef.current = null;
        setAddingId(null);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black">
              <PackagePlus className="h-5 w-5" />
            </span>
            افزودن محصول به اتاق
          </DialogTitle>
          <DialogDescription>
            محصول موردنظر را جستجو و به اتاق استایل اضافه کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی محصول..."
            autoFocus
            className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pe-3 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-500" />
            </div>
          )}
          {!loading && products.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">محصولی یافت نشد.</p>
          )}
          {!loading &&
            products.map((product) => {
              const img = product.primary_image || PLACEHOLDER_IMG;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAdd(product)}
                  disabled={addItem.isPending || addingId === product.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 text-start transition hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50"
                >
                  <img src={img} alt={product.name} className="h-14 w-12 shrink-0 rounded-xl object-cover bg-muted/30" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{product.name}</p>
                    <p className="mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  {addingId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-amber-600/70 dark:text-amber-400/70" />
                  )}
                </button>
              );
            })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={addItem.isPending}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;