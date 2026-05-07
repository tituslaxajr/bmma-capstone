import { useNavigate, useLocation } from "react-router";
import { startTransition } from "react";
import { Home, ArrowLeft, Search, MapPin } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

const KF = `
@keyframes nfPageIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes nfFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes nfPulse{0%,100%{opacity:.4}50%{opacity:.8}}
`;

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const suggestions = [
    { label: "Go Home", icon: <Home size={16} />, path: "/" },
    { label: "Go Back", icon: <ArrowLeft size={16} />, action: () => startTransition(() => navigate(-1)) },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: `radial-gradient(ellipse at 50% 20%, ${withAlpha(DT.blue, 0.06)} 0%, ${DT.base} 70%)`,
        fontFamily: FT.b,
        animation: "nfPageIn 500ms ease-out",
      }}
    >
      <style>{KF}</style>

      <div className="max-w-md w-full text-center">
        {/* Floating icon */}
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
            border: `1px solid ${DT.borderSub}`,
            boxShadow: DT.shadowMd,
            animation: "nfFloat 3s ease-in-out infinite",
          }}
        >
          <MapPin size={36} style={{ color: DT.textDis }} />
        </div>

        {/* 404 number */}
        <h1
          style={{
            fontFamily: FT.h,
            fontSize: "clamp(72px, 12vw, 120px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            background: `linear-gradient(135deg, ${DT.blue}, ${DT.purple})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </h1>

        {/* Title */}
        <h2
          className="mt-2"
          style={{
            fontFamily: FT.h,
            fontSize: "clamp(20px, 3vw, 26px)",
            fontWeight: 700,
            color: DT.textPri,
          }}
        >
          Page Not Found
        </h2>

        {/* Description */}
        <p
          className="mt-3 mx-auto"
          style={{
            fontSize: 14,
            color: DT.textSec,
            lineHeight: 1.6,
            maxWidth: 340,
          }}
        >
          The page <code
            className="px-1.5 py-0.5 rounded-md"
            style={{
              fontSize: 12,
              fontFamily: FT.m,
              background: DT.raised,
              border: `1px solid ${DT.borderDef}`,
              color: DT.blue,
            }}
          >{location.pathname}</code> doesn't exist or has been moved.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={s.action || (() => startTransition(() => navigate(s.path!)))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all cursor-pointer hover:opacity-90"
              style={{
                background: s.label === "Go Home"
                  ? DT.blue
                  : "transparent",
                color: s.label === "Go Home" ? "white" : DT.textSec,
                border: `1px solid ${s.label === "Go Home" ? "transparent" : DT.borderDef}`,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: FT.h,
              }}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {/* Help text */}
        <p
          className="mt-8 flex items-center justify-center gap-1.5"
          style={{ fontSize: 12, color: DT.textTer }}
        >
          <Search size={12} />
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
          >Ctrl+K</kbd> to search
        </p>
      </div>
    </div>
  );
}