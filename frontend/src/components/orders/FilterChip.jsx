const FilterChip = ({ active, onClick, label, count, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition-all duration-300 sm:rounded-2xl sm:px-3.5 sm:py-2 sm:text-xs ${
      active
        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
        : 'border-border/60 bg-card/70 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:text-foreground hover:shadow-md'
    }`}
  >
    {Icon && <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${active ? 'opacity-90' : 'opacity-60'}`} />}
    {label}
    {count > 0 && (
      <span
        className={`rounded-full px-1 py-0.5 text-[10px] font-bold tabular-nums sm:px-1.5 sm:text-xs ${
          active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
        }`}
      >
        {count.toLocaleString('fa-IR')}
      </span>
    )}
  </button>
);

export default FilterChip;
