const AmbientBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.09]" />
    <div className="absolute top-1/3 -left-32 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.05] blur-3xl dark:bg-violet-400/[0.07]" />
    <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-blue-500/[0.04] blur-3xl dark:bg-blue-400/[0.06]" />
    <div
      className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }}
    />
  </div>
);

export default AmbientBg;
