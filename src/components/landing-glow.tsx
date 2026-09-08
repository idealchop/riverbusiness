export function LandingGlowBackdrop() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[140px]" />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay animate-drift"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute left-0 animate-slide-down shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      </div>
    </div>
  );
}
