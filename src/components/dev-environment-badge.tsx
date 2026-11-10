import { isDevAppEnvironment } from "@/lib/firestore-database";

/** Small fixed badge so the dev App Hosting site is not mistaken for live. */
export function DevEnvironmentBadge() {
  if (!isDevAppEnvironment()) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-3 right-3 z-[200] select-none rounded-full border border-amber-800/20 bg-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-950 shadow-sm"
      role="status"
    >
      DEV
    </div>
  );
}
