import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";

/**
 * FrozenRoute — captures the outlet at first render so the exit animation
 * always shows the correct (old) route content instead of the incoming route.
 * This is mounted once per location key and never re-renders its frozen content.
 */
function FrozenRoute({ outlet }: { outlet: React.ReactNode }) {
  const frozen = useRef(outlet);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      style={{ minHeight: "100%", width: "100%" }}
    >
      {frozen.current}
    </motion.div>
  );
}

/**
 * AnimatedOutlet — wraps React Router's Outlet with a subtle
 * cross-fade transition between route changes.
 *
 * KEY: We intentionally do NOT use mode="wait". That mode defers rendering
 * the new route until after the exit animation completes — which runs outside
 * the startTransition context — causing React to throw
 * "suspended while responding to synchronous input" for any lazy route.
 *
 * With mode="popLayout" (or no mode), the new FrozenRoute mounts immediately
 * in the same render cycle as the navigation (inside the active transition),
 * so lazy-route suspension is safely caught by the Suspense boundaries inside
 * each route's lazy() wrapper.
 */
export function AnimatedOutlet({ context }: { context?: any }) {
  const location = useLocation();
  const outlet = useOutlet(context);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <FrozenRoute key={location.pathname} outlet={outlet} />
    </AnimatePresence>
  );
}
