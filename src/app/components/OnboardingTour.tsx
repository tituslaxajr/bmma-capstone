import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, FileText, Shield, BarChart3 } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ─── Tour Steps ─── */
interface TourStep {
  title: string;
  desc: string;
  icon: ReactNode;
}

const STUDENT_STEPS: TourStep[] = [
  {
    title: "Welcome to CapstonePH!",
    desc: "Your one-stop portal for managing your BMMA capstone project — from manuscript submissions to defense results.",
    icon: <Sparkles size={24} />,
  },
  {
    title: "Submit Manuscripts",
    desc: "Upload your pre-defense files and project outputs. Your adviser and panelists will review them here.",
    icon: <FileText size={24} />,
  },
  {
    title: "Defense Prep",
    desc: "Check your defense schedule, venue, and panelist assignments. Everything you need is in one place.",
    icon: <Shield size={24} />,
  },
  {
    title: "Track Results",
    desc: "View your defense grades, feedback from panelists, and peer evaluation scores — all updated in real time.",
    icon: <BarChart3 size={24} />,
  },
];

const PANELIST_STEPS: TourStep[] = [
  {
    title: "Welcome, Panelist!",
    desc: "Review student manuscripts, grade defense presentations, and manage your panel assignments all in one place.",
    icon: <Sparkles size={24} />,
  },
  {
    title: "Pre-Defense Review",
    desc: "Access all assigned group manuscripts. Leave comments and track revision status before defense day.",
    icon: <FileText size={24} />,
  },
  {
    title: "Defense Grading",
    desc: "Score groups during defense using Section A (group) and Section B (individual) criteria. Scores auto-aggregate.",
    icon: <BarChart3 size={24} />,
  },
];

const COORDINATOR_STEPS: TourStep[] = [
  {
    title: "Welcome, Coordinator!",
    desc: "Manage users, groups, panelist assignments, and oversee the entire capstone defense workflow.",
    icon: <Sparkles size={24} />,
  },
  {
    title: "User & Group Management",
    desc: "Add students, create groups, assign panelists and advisers. Bulk import is supported.",
    icon: <FileText size={24} />,
  },
  {
    title: "Defense Oversight",
    desc: "Schedule defenses, monitor grading progress, and export final results. Full visibility across all groups.",
    icon: <Shield size={24} />,
  },
];

const ROLE_STEPS: Record<string, TourStep[]> = {
  student: STUDENT_STEPS,
  panelist: PANELIST_STEPS,
  adviser: PANELIST_STEPS,
  coordinator: COORDINATOR_STEPS,
};

const STORAGE_KEY = "capstoneph_tour_seen";

/** Call this from anywhere to replay the onboarding tour */
export function replayOnboardingTour() {
  window.dispatchEvent(new CustomEvent("replay-onboarding-tour"));
}

const KF = `
@keyframes tourIn{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes tourPulse{0%,100%{box-shadow:0 0 0 0 rgba(77,143,255,0.3)}50%{box-shadow:0 0 0 8px rgba(77,143,255,0)}}
`;

interface OnboardingTourProps {
  role: string;
  userId?: string;
}

export function OnboardingTour({ role, userId }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [isReplay, setIsReplay] = useState(false);

  const storageId = `${STORAGE_KEY}_${userId || "anon"}_${role}`;
  const steps = ROLE_STEPS[role] || STUDENT_STEPS;

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageId);
      if (!seen) {
        // Delay slightly so the page renders first
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable
    }
  }, [storageId]);

  /* Listen for replay event */
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setIsReplay(true);
      setVisible(true);
    };
    window.addEventListener("replay-onboarding-tour", handler);
    return () => window.removeEventListener("replay-onboarding-tour", handler);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(storageId, "1");
    } catch { /* noop */ }
  }, [storageId]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, step]);

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={dismiss}
    >
      <style>{KF}</style>
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          background: DT.dark,
          border: `1px solid ${DT.borderSub}`,
          boxShadow: DT.shadowXl,
          animation: "tourIn 350ms ease-out",
        }}
      >
        {/* Progress bar */}
        <div className="h-1 w-full" style={{ background: DT.raised }}>
          <div
            className="h-full transition-all duration-300 rounded-r-full"
            style={{
              width: `${((step + 1) / steps.length) * 100}%`,
              background: `linear-gradient(90deg, ${DT.blue}, ${DT.purple})`,
            }}
          />
        </div>

        {/* Close */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={dismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer"
            style={{ color: DT.textTer }}
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2 text-center">
          {/* Icon */}
          <div
            className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: withAlpha(DT.blue, 0.12),
              color: DT.blue,
              animation: "tourPulse 2s ease-in-out infinite",
            }}
          >
            {current.icon}
          </div>

          <h3
            style={{
              fontFamily: FT.h,
              fontSize: 20,
              fontWeight: 700,
              color: DT.textPri,
              lineHeight: 1.3,
            }}
          >
            {current.title}
          </h3>

          <p
            className="mt-2 mx-auto"
            style={{
              fontSize: 14,
              color: DT.textSec,
              lineHeight: 1.6,
              maxWidth: 340,
              fontFamily: FT.b,
            }}
          >
            {current.desc}
          </p>
        </div>

        {/* Navigation */}
        <div
          className="flex items-center justify-between px-6 py-4 mt-2"
          style={{ borderTop: `1px solid ${DT.borderHair}` }}
        >
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all cursor-pointer"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? DT.blue : withAlpha(DT.blue, 0.2),
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FT.h,
                  color: DT.textSec,
                  border: `1px solid ${DT.borderDef}`,
                }}
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer hover:opacity-90"
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FT.h,
                color: "white",
                background: DT.blue,
              }}
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}