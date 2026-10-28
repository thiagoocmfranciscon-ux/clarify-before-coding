export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Nobre Empilhadeiras">
      <rect width="100" height="100" rx="20" className="fill-primary" />
      <g className="fill-primary-foreground">
        <path d="M22 47C22 43 25 40 29 40C33 40 35 43 35 47V74C35 78 33 80 29 80C25 80 22 78 22 74V47Z" />
        <path d="M23 37C23 27 34 20 48 24C60 27 65 37 65 47V80H52V49C52 40 45 34 38 34C31 34 29 38 29 41L23 37Z" />
        <path d="M65 24C65 20 68 20 72 20C76 20 77 22 77 26V74C77 78 75 80 71 80H65V24Z" />
      </g>
      <g className="fill-sidebar">
        <path d="M66 23.5L71 32L76 23.5L74.5 28L71 25.5L67.5 28L66 23.5Z" />
        <polygon points="68,24 71,29 74,24" />
      </g>
    </svg>
  );
}

export function BrandLockup({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <div className="leading-tight">
        <div className={`text-base font-bold tracking-tight ${inverted ? "text-sidebar-accent-foreground" : "text-foreground"}`}>NOBRE</div>
        <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${inverted ? "text-sidebar-foreground" : "text-muted-foreground"}`}>Empilhadeiras</div>
      </div>
    </div>
  );
}
