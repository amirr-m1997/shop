const AmbientMesh = ({ variant = 'default' }) => {
  if (variant === 'dark') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.07]" />
      <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-violet-500/[0.04] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.28] dark:opacity-[0.1]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.035) 1px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />
    </div>
  );
};

export default AmbientMesh;
