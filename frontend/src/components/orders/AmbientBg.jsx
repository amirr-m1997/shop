const AmbientBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-36 -right-20 h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.09]" />
    <div className="absolute top-1/3 -left-28 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.05] blur-3xl dark:bg-violet-400/[0.07]" />
    <div className="absolute bottom-10 right-1/3 h-56 w-56 rounded-full bg-blue-500/[0.04] blur-3xl" />
    <div
      className="absolute inset-0 opacity-[0.32] dark:opacity-[0.12]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }}
    />
  </div>
);

export default AmbientBg;
