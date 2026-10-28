import full from "@/assets/logo-heli-nobre.png.asset.json";
import nobre from "@/assets/logo-nobre.png.asset.json";
import nobreWhite from "@/assets/logo-nobre-white.png.asset.json";

export const BRAND_NAME = "Empilha Nobre";

export function BrandMark({ className = "h-9", inverted = false }: { className?: string; inverted?: boolean }) {
  return <img src={(inverted ? nobreWhite : nobre).url} alt={BRAND_NAME} className={`${className} w-auto object-contain`} />;
}

export function BrandFull({ className = "h-10" }: { className?: string }) {
  return <img src={full.url} alt={`HELI · ${BRAND_NAME}`} className={`${className} w-auto object-contain`} />;
}

export function BrandLockup({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <BrandMark inverted={inverted} className="h-9" />
      <span className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${inverted ? "text-sidebar-foreground" : "text-muted-foreground"}`}>
        Gestão de manutenção
      </span>
    </div>
  );
}
