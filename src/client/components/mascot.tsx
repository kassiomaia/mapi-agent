import { cn } from "@/components/beui/lib/utils";

export const AGENT_NAME = "Mapi";

type MascotProps = Readonly<{
  className?: string;
  decorative?: boolean;
}>;

export function Mascot({ className, decorative = false }: MascotProps) {
  return (
    <img
      src="/static/brand/mapi.png"
      alt={decorative ? "" : `${AGENT_NAME}, um mapa dobrado sorridente`}
      width={512}
      height={512}
      decoding="async"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
    />
  );
}
