import { cn } from "@/lib/utils";

interface WaterIndicatorProps {
  percentage: number;
  className?: string;
}

export function WaterIndicator({ percentage, className }: WaterIndicatorProps) {
  const heightStyle = {
    height: `${Math.max(0, Math.min(100, percentage))}%`,
  };

  return (
    <div
      className={cn("relative mt-auto h-24 w-full overflow-hidden bg-primary/10", className)}
    >
      <div
        className="absolute bottom-0 left-0 w-full"
        style={heightStyle}
      >
        <div className="relative h-full">
          <div className="absolute -bottom-1 left-0 right-0 h-4 rounded-full bg-primary/30 opacity-50 blur-lg" />
          <div
            className="absolute bottom-0 w-[200%] h-full bg-primary/40 animate-[wave_3s_linear_infinite]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='wave' x='0' y='0' width='60' height='20' patternUnits='userSpaceOnUse'%3e%3cpath fill='none' stroke='hsl(var(--water))' stroke-width='2' d='M 0 10 C 15 0 15 20 30 10 S 45 0 60 10' /%3e%3c/pattern%3e%3c/defs%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23wave)'%3e%3c/rect%3e%3c/svg%3e")`,
            }}
          />
           <div
            className="absolute bottom-0 w-[200%] h-full bg-primary/20 opacity-80 animate-[wave_5s_linear_infinite_reverse]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cdefs%3e%3cpattern id='wave2' x='0' y='0' width='80' height='25' patternUnits='userSpaceOnUse'%3e%3cpath fill='none' stroke='hsl(var(--water))' stroke-width='2' d='M 0 10 C 20 0 20 20 40 10 S 60 0 80 10' /%3e%3c/pattern%3e%3c/defs%3e%3crect x='0' y='0' width='100%25' height='100%25' fill='url(%23wave2)'%3e%3c/rect%3e%3c/svg%3e")`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
