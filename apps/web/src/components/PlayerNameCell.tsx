import { useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  name: string;
  headshotUrl: string | null;
  className?: string;
}

export function PlayerAvatar({ name, headshotUrl, className }: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!headshotUrl || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground",
          className,
        )}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={headshotUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-muted object-cover object-top", className)}
    />
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

interface PlayerNameCellProps {
  name: string;
  headshotUrl: string | null;
  className?: string;
}

export function PlayerNameCell({ name, headshotUrl, className }: PlayerNameCellProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PlayerAvatar name={name} headshotUrl={headshotUrl} className="h-8 w-8" />
      <span className="truncate text-sm">{name}</span>
    </div>
  );
}
