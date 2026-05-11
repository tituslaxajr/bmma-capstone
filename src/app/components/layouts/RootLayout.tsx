import { Suspense, lazy, useEffect, useState } from "react";
import { Outlet } from "react-router";
import { useAuth } from "../../lib/AuthContext";

const KeyboardShortcutsModal = lazy(() => import("../KeyboardShortcutsModal").then((m) => ({ default: m.KeyboardShortcutsModal })));

export function RootLayout() {
  const { loading } = useAuth();
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.closest("input, textarea, select, [contenteditable='true']");
      if (isTyping) return;
      if (event.key === "?" || (event.key === "/" && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        setShowKeyboardModal(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Outlet />
      {!loading && showKeyboardModal ? (
        <Suspense fallback={null}>
          <KeyboardShortcutsModal />
        </Suspense>
      ) : null}
    </>
  );
}
