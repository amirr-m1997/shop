const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
  action,
  accent = 'bg-primary',
  light = false,
}) => (
  <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-3 flex items-center gap-2.5">
          <div className={`h-7 w-1 rounded-full ${accent}`} />
          <span
            className={`text-[11px] font-bold uppercase tracking-[0.2em] ${
              light ? 'text-white/60' : 'text-muted-foreground'
            }`}
          >
            {eyebrow}
          </span>
        </div>
      )}
      <h2
        className={`text-2xl font-black tracking-tight sm:text-3xl md:text-4xl ${
          light ? 'text-white' : ''
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-2 max-w-lg text-sm leading-relaxed sm:text-base ${
            light ? 'text-white/65' : 'text-muted-foreground'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

export default SectionHeader;
