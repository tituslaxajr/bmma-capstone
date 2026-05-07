import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

const SHORTCUTS = [
  { keys: ["Ctrl", "K"], desc: "Open search" },
  { keys: ["Ctrl", "/"], desc: "Show keyboard shortcuts" },
  { keys: ["Esc"], desc: "Close modals & dialogs" },
];

const KF = `@keyframes kbmIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`;

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }}
      onClick={() => setOpen(false)}
    >
      <style>{KF}</style>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          background: DT.dark,
          border: `1px solid ${DT.borderSub}`,
          boxShadow: DT.shadowXl,
          animation: "kbmIn 200ms ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${DT.borderHair}` }}
        >
          <div className="flex items-center gap-2.5">
            <Keyboard size={18} style={{ color: DT.blue }} />
            <span style={{ fontFamily: FT.h, fontWeight: 700, fontSize: 15, color: DT.textPri }}>
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer"
            style={{ color: DT.textTer }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="px-5 py-4 space-y-3">
          {SHORTCUTS.map(s => (
            <div key={s.desc} className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: DT.textSec, fontFamily: FT.b }}>
                {s.desc}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    <kbd
                      className="inline-flex items-center justify-center px-2 py-1 rounded-md"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: FT.m,
                        background: DT.raised,
                        border: `1px solid ${DT.borderDef}`,
                        color: DT.textPri,
                        minWidth: 28,
                        textAlign: "center",
                      }}
                    >
                      {k}
                    </kbd>
                    {i < s.keys.length - 1 && (
                      <span style={{ fontSize: 11, color: DT.textDis, margin: "0 2px" }}>+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          className="px-5 py-3 text-center"
          style={{
            borderTop: `1px solid ${DT.borderHair}`,
            fontSize: 11,
            color: DT.textTer,
            fontFamily: FT.b,
          }}
        >
          Press <kbd
            className="px-1.5 py-0.5 rounded-md mx-0.5"
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: FT.m,
              background: DT.raised,
              border: `1px solid ${DT.borderDef}`,
              color: DT.textSec,
            }}
          >Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}