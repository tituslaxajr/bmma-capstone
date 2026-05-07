import { type ReactNode, type CSSProperties } from "react";
import { FT } from "./cinematic-tokens";
import { KF_STANDARD, KF_DASHBOARD, ANIM } from "./animations";

/**
 * Shared page wrapper that consolidates the repeated outer-shell pattern.
 *
 * Before PageShell, every page did:
 *   const KF = `@keyframes xxFade{from{opacity:0}to{opacity:1}}`;
 *   <div className="space-y-5" style={{ fontFamily: FT.b, animation: "xxFade 400ms ease-out" }}>
 *     <style>{KF}</style>
 *     ...
 *   </div>
 *
 * Now:
 *   <PageShell>
 *     ...
 *   </PageShell>
 */

interface PageShellProps {
  children: ReactNode;
  /** Extra class names appended to the outer div. Default: "space-y-5" */
  className?: string;
  /** Override the animation. Default: cpPageIn 400ms ease-out */
  animation?: string;
  /** Inject the dashboard keyframe bundle (standard + pulse + float) instead of just standard. */
  dashboard?: boolean;
  /** Any additional inline styles. */
  style?: CSSProperties;
}

export function PageShell({
  children,
  className = "space-y-5",
  animation = ANIM.pageIn,
  dashboard = false,
  style,
}: PageShellProps) {
  return (
    <div
      className={className}
      style={{
        fontFamily: FT.b,
        animation,
        ...style,
      }}
    >
      <style>{dashboard ? KF_DASHBOARD : KF_STANDARD}</style>
      {children}
    </div>
  );
}