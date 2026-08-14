import { useEffect, useState } from 'react';
import { Gift, Loader2, Search, X } from 'lucide-react';
import { productsAPI } from '../../services/api';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const StyleRoomProductPicker = ({ open, onClose, onSelect, busy }) => {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setNote('');
    setLoading(true);
    productsAPI.getProducts({ page_size: 12, is_active: true })
      .then((response) => setProducts(response.data?.results || response.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) return undefined;
    const timer = setTimeout(() => {
      setLoading(true);
      productsAPI.getProducts({ page_size: 12, is_active: true, search: query.trim() })
        .then((response) => setProducts(response.data?.results || response.data || []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Close product picker" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-popover shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-black"><Gift className="h-4 w-4" /></div>
            <div><h3 className="text-sm font-black text-foreground">Share a product</h3><p className="text-[11px] text-muted-foreground">Add a note and send it to the room</p></div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" autoFocus className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-amber-500/40" />
          </div>
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Add an optional note" className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-amber-500/40" />
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>}
          {!loading && products.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No products found.</p>}
          {!loading && products.map((product) => (
            <button key={product.id} type="button" disabled={busy} onClick={() => onSelect(product, note.trim())} className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50">
              <img src={product.primary_image || PLACEHOLDER_IMG} alt={product.name} className="h-14 w-12 shrink-0 rounded-xl bg-muted/30 object-cover" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{product.name}</span><span className="mt-0.5 block text-xs font-bold text-amber-600 dark:text-amber-400">{formatPrice(product.price)}</span></span>
              {busy && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StyleRoomProductPicker;
