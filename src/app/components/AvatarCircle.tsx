import { DT } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   AVATAR CIRCLE — Unified avatar component
   Replaces: Avatar (UserMgmt, PanelistAssignment),
              Ava (GroupsTeams)
   ═══════════════════════════════════════════ */

const PALETTE = [DT.stiBlue, "#4F46E5", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#059669", "#2563EB"];

interface AvatarCircleProps {
  /** Direct initials string (takes priority over `name`) */
  initials?: string;
  /** Full name — initials derived automatically if `initials` not provided */
  name?: string;
  /** Pixel size (default 32) */
  size?: number;
  /** Palette index for deterministic color (default 0) */
  idx?: number;
  /** Optional avatar image URL */
  avatarUrl?: string | null;
}

export function AvatarCircle({ initials, name, size = 32, idx = 0, avatarUrl }: AvatarCircleProps) {
  const derived = initials || (name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "??");
  const bg = PALETTE[idx % PALETTE.length];

  if (avatarUrl) {
    return (
      <div className="rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <img
          src={avatarUrl}
          alt={derived}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = "none";
            const parent = img.parentElement!;
            parent.style.background = bg;
            parent.innerHTML = `<span style="font-size:${size * 0.35}px;font-weight:700;color:white;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${derived}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, fontWeight: 700, background: bg }}
    >
      {derived}
    </div>
  );
}
