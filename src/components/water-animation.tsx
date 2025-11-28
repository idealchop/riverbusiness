import { cn } from '@/lib/utils';

export function WaterAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 top-1/4 bg-primary",
          "before:content-[''] before:absolute before:w-[200%] before:h-[200%] before:-top-3/4 before:left-0 before:rounded-[45%] before:bg-card before:animate-[wave_5s_linear_infinite]",
          "after:content-[''] after:absolute after:w-[200%] after:h-[200%] after:-top-3/4 after:left-0 after:rounded-[40%] after:bg-card after:opacity-50 after:animate-[wave_10s_linear_infinite] after:[animation-direction:reverse]"
        )}
      />
    </div>
  );
}
