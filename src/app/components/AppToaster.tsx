import { Toaster } from "sonner";

/**
 * Global toaster — bottom-right stack, max 3 visible.
 * Style matches CapstonePH design system: white rounded-16, shadow-lg, colored left border.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      visibleToasts={3}
      gap={8}
      theme="dark"
      toastOptions={{
        style: {
          fontFamily: "var(--font-body)",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.40)",
          padding: "14px 18px",
          minWidth: "320px",
          fontSize: "13px",
          background: "#161B2E",
          color: "#EEF0F6",
          border: "1px solid rgba(255,255,255,0.07)",
        },
        classNames: {
          success: "!border-l-4 !border-l-[#4ADE80]",
          error: "!border-l-4 !border-l-[#F87171]",
          warning: "!border-l-4 !border-l-[#FBBF24]",
          info: "!border-l-4 !border-l-[#4D8FFF]",
        },
      }}
    />
  );
}