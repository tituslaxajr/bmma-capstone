import { Outlet } from "react-router";
import { useAuth } from "../../lib/AuthContext";
import { KeyboardShortcutsModal } from "../KeyboardShortcutsModal";

export function RootLayout() {
  const { loading } = useAuth();

  /* Always return a stable Fragment root — avoids React 18 "Expected static
     flag was missing" warning that fires when the root element type switches
     between a <div> and a Fragment on the same component instance. */
  return (
    <>
      {loading ? (
        <div
          className="h-screen flex items-center justify-center"
          style={{ background: "#07090F" }}
          role="status"
          aria-label="Loading application"
        >
          <div className="text-center">
            <div
              className="w-10 h-10 border-3 border-[#4D8FFF] border-t-transparent rounded-full animate-spin mx-auto"
              aria-hidden="true"
            />
            <p
              className="mt-3"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                color: "rgba(238,240,246,0.45)",
              }}
            >
              Loading...
            </p>
            <span className="sr-only">
              Loading Hue We Are portal, please wait.
            </span>
          </div>
        </div>
      ) : (
        <>
          <Outlet />
          <KeyboardShortcutsModal />
        </>
      )}
    </>
  );
}
