export function CenterNode() {
  return (
    <div 
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full animate-pulse-soft"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.4), transparent 70%)',
          width: '120px',
          height: '120px',
          left: '-28px',
          top: '-28px',
        }}
      />
      
      {/* Main circle */}
      <div 
        className="relative w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-glow"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent) / 0.8))',
        }}
      >
        <span className="text-accent-foreground font-semibold text-lg">You</span>
      </div>
    </div>
  );
}
