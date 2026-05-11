import { DT } from "../cinematic-tokens";

export function AuthShellLoader({ label = "Loading..." }: { label?: string }) {
  return (
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
            color: DT.textSec,
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
