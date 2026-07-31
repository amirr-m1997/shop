const FilterChip = ({ active, onClick, label, count, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all duration-300 ${
      active
        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
        : 'border-border/60 bg-card/70 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:text-foreground hover:shadow-md'
    }`}
  >
    {Icon && <Icon className={`h-3.5 w-3.5 ${active ? 'opacity-90' : 'opacity-60'}`} />}
    {label}
    {count > 0 && (
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
          active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
        }`}
      >
        {count.toLocaleString('fa-IR')}
      </span>
    )}
  </button>
);

export default FilterChip;
