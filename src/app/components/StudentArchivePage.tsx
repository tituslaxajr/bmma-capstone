import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle, Clock, Circle, Lock, Upload, Download, Eye,
  FileText, Award, ChevronDown, ChevronUp, Link2, Archive, Shield,
  ClipboardEdit, Loader2, ShieldAlert, XCircle, ExternalLink,
} from "lucide-react";
import { DT, FT } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { ContextualTip, TIPS } from "./ContextualTip";
import { toast } from "sonner";
import { useInView } from "./ui/shared-ui";
import { inputStyle, focusIn, focusOut } from "./ui/shared-ui";
import { PageShell } from "./PageShell";

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function FadeIn({ delay = 0, children, className = "" }: { delay?: number; children: ReactNode; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
      filter: visible ? "blur(0)" : "blur(4px)",
      transition: `opacity 450ms ease-out ${delay}ms, transform 450ms ease-out ${delay}ms, filter 450ms ease-out ${delay}ms`,
    }}>{children}</div>
  );
}

/* ═══════════════════════════════════════════
   Types & Data
   ═══════════════════════════════════════════ */
type ItemStatus = "complete" | "pending" | "empty" | "locked";

interface ArchiveItemDef {
  id: number;
  label: string;
  desc: string;
  action?: "upload" | "view" | "download" | "link" | "certificate" | "form";
}

const ITEM_DEFS: ArchiveItemDef[] = [
  { id: 1, label: "Revisions Completed", desc: "Confirmed by adviser after all revision items are addressed", action: "upload" },
  { id: 2, label: "Approval Sheet Obtained", desc: "Scanned copy of signed approval sheet uploaded", action: "upload" },
  { id: 3, label: "Final Manuscript Finalized", desc: "Final version of the manuscript PDF with all corrections", action: "upload" },
  { id: 4, label: "Hardbound Copy Submitted", desc: "Submit hardbound copy to library/coordinator", action: "upload" },
  { id: 5, label: "Soft Copy to STI Library", desc: "Upload to the STI research outputs portal", action: "link" },
  { id: 6, label: "Peer Evaluation Form", desc: "Fill out evaluation for each group member", action: "form" },
  { id: 7, label: "Final Grade Released", desc: "Available after items 1–6 complete" },
  { id: 8, label: "Certificate of Completion", desc: "Download official certificate", action: "certificate" },
];

const badgeStyles: Record<string, { c: string; bg: string; border: string }> = {
  success: { c: DT.success, bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.15)" },
  warning: { c: DT.warning, bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
  neutral: { c: DT.textTer, bg: "rgba(255,255,255,0.03)", border: DT.borderDef },
  locked: { c: DT.textDis, bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)" },
};

function StatusIcon({ status }: { status: ItemStatus }) {
  const size = 20;
  switch (status) {
    case "complete": return <CheckCircle size={size} style={{ color: DT.success }} />;
    case "pending": return <Clock size={size} style={{ color: DT.warning }} />;
    case "empty": return <Circle size={size} style={{ color: DT.textDis }} />;
    case "locked": return <Lock size={size} style={{ color: DT.textDis }} />;
  }
}

/* Progress Ring */
function ProgressRingDark({ pct, size }: { pct: number; size: number }) {
  const sw = size * 0.08; const r = (size - sw) / 2; const circ = 2 * Math.PI * r;
  const { ref, visible } = useInView();
  const [offset, setOffset] = useState(circ);
  useEffect(() => { if (visible) { const t = setTimeout(() => setOffset(circ - (pct / 100) * circ), 150); return () => clearTimeout(t); } }, [visible, pct, circ]);
  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DT.blue} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out", filter: `drop-shadow(0 0 6px ${DT.blueGlow})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: FT.h, fontSize: size * 0.22, fontWeight: 700, color: DT.textPri, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 9, color: DT.textTer, marginTop: 1 }}>done</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Archive Row
   ═══════════════════════════════════════════ */
function ArchiveRow({ def, status, badgeLabel, badgeVariant, archiveItem, groupNumber, index, onNavigate, onUpdate }: {
  def: ArchiveItemDef; status: ItemStatus; badgeLabel: string; badgeVariant: string;
  archiveItem: any; groupNumber: number; index: number;
  onNavigate?: (page: number) => void; onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const canExpand = status === "pending" || status === "empty";
  const bs = badgeStyles[badgeVariant] || badgeStyles.neutral;

  const handleSubmitItem = async () => {
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch(`/archive/group/${groupNumber}`, {
        method: "PUT",
        body: JSON.stringify({ itemId: def.id, status: "complete", linkUrl: linkInput.trim() || null }),
      }, session?.access_token!);
      toast.success(`${def.label} marked as complete!`);
      setExpanded(false); setLinkInput("");
      onUpdate();
    } catch (err: any) { toast.error(err.message || "Failed to update"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ borderBottom: `1px solid ${DT.borderHair}`, animation: `cpFadeUpBlur 400ms ease-out ${index * 60}ms both` }}>
      <button
        onClick={() => canExpand && setExpanded(!expanded)}
        className={`w-full flex items-center gap-4 px-6 lg:px-7 transition-colors ${canExpand ? "hover:bg-white/[0.03] cursor-pointer" : status === "locked" ? "opacity-50" : ""}`}
        style={{ height: 72 }}>
        <span className="shrink-0"><StatusIcon status={status} /></span>
        <div className="flex-1 min-w-0 text-left">
          <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: status === "locked" ? DT.textDis : DT.textPri }}>{def.label}</span>
          <div style={{ fontFamily: FT.b, fontSize: 12, color: DT.textTer, marginTop: 1 }}>
            {archiveItem?.updatedAt ? `Completed ${new Date(archiveItem.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : def.desc}
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 10, fontWeight: 600, color: bs.c, background: bs.bg, border: `1px solid ${bs.border}` }}>
          {badgeLabel}
        </span>
        {status === "complete" && archiveItem?.linkUrl && (
          <a href={archiveItem.linkUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg transition hover:bg-white/[0.05]" style={{ color: DT.textTer }}>
            <ExternalLink size={14} />
          </a>
        )}
        {canExpand && <span className="shrink-0 ml-1" style={{ color: DT.textTer }}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>}
        {status === "locked" && def.action === "certificate" && (
          <div className="w-14 h-9 rounded-lg flex items-center justify-center shrink-0 ml-2 overflow-hidden"
            style={{ background: "rgba(255,209,0,0.06)", filter: "blur(2px)" }}>
            <Award size={18} style={{ color: DT.yellow }} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-6 lg:px-7 pb-5 pt-1 pl-16" style={{ animation: "cpFadeUpBlur 250ms ease-out both" }}>
          {(def.action === "upload" || def.action === "link") && (
            <div className="flex gap-2">
              <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                placeholder={def.action === "link" ? "Paste link to research portal..." : "Paste Google Drive link to your file..."}
                className="flex-1 px-4 py-2.5 rounded-xl transition" style={inputStyle}
                onFocus={focusIn}
                onBlur={focusOut} />
              <button onClick={handleSubmitItem} disabled={saving}
                className="px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer hover:opacity-90 disabled:opacity-40"
                style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 600, fontFamily: FT.h }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : def.action === "link" ? <><Link2 size={14} /> Submit</> : <><Upload size={14} /> Submit</>}
              </button>
            </div>
          )}
          {def.action === "form" && (
            <div className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4"
              style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.12)` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(77,143,255,0.15)" }}>
                <ClipboardEdit size={18} style={{ color: DT.blue }} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>Evaluate Your Group Members</p>
                <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>Rate each member on cooperation, quality, timeliness, and communication.</p>
              </div>
              <button onClick={() => onNavigate?.(5)}
                className="px-5 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer hover:opacity-90 shrink-0"
                style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 600, fontFamily: FT.h }}>
                <ClipboardEdit size={14} /> Fill Out Form
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════ */
export function StudentArchivePage({ onNavigate }: { onNavigate?: (page: number) => void }) {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [archiveData, setArchiveData] = useState<any>({ items: {} });
  const [defenseUnlocked, setDefenseUnlocked] = useState(false);
  const [defenseVerdict, setDefenseVerdict] = useState("pending");
  const [peerEvalSubmitted, setPeerEvalSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const ctx = await apiFetch<any>("/me/context");
      setGroup(ctx.myGroup || null);

      if (ctx.myGroup) {
        const gn = ctx.myGroup.number || ctx.myGroup.id;
        const archRes = await apiFetch<any>(`/archive/group/${gn}`);
        setArchiveData(archRes.archive || { items: {} });
        setDefenseUnlocked(archRes.defenseUnlocked);
        setDefenseVerdict(archRes.defenseVerdict);
        setPeerEvalSubmitted(archRes.peerEvalSubmitted);
      }
    } catch (err) { console.error("Failed to load archive:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: DT.blue }} />
        <span style={{ color: DT.textSec, fontSize: 14, fontFamily: FT.b }}>Loading archive...</span>
      </div>
    );
  }

  /* ─── DEFENSE NOT PASSED — LOCKED GATE ─── */
  if (!defenseUnlocked) {
    const verdictLabel = defenseVerdict === "failed" ? "Defense didn't pass."  :
      defenseVerdict === "pending" ? "Waiting on defense results." :
      "Waiting on results.";
    return (
      <div className="max-w-[1280px] mx-auto py-16 px-6 text-center" style={{ fontFamily: FT.b }}>
        <div className="rounded-3xl p-12" style={{
          background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
        }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{
            background: defenseVerdict === "failed" ? DT.redDim : "rgba(255,255,255,0.04)",
            border: `2px solid ${defenseVerdict === "failed" ? "rgba(248,113,113,0.2)" : DT.borderDef}`,
          }}>
            {defenseVerdict === "failed" ? <XCircle size={36} style={{ color: DT.red }} /> : <ShieldAlert size={36} style={{ color: DT.textDis }} />}
          </div>
          <h2 style={{ fontFamily: FT.h, fontSize: 28, fontWeight: 700, color: DT.textPri }}>Archive Locked</h2>
          <p className="mt-2 max-w-lg mx-auto" style={{ fontSize: 14, color: DT.textSec, lineHeight: 1.6 }}>
            {verdictLabel}
          </p>
          {defenseVerdict === "failed" && (
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl" style={{ background: DT.redDim, border: `1px solid rgba(248,113,113,0.15)` }}>
              <XCircle size={16} style={{ color: DT.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: DT.red }}>Talk to your adviser about re-defense</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── COMPUTE ITEM STATUSES ─── */
  const items = archiveData?.items || {};

  function getItemState(def: ArchiveItemDef): { status: ItemStatus; badge: string; badgeVariant: string } {
    // Peer eval (item 6) - special check
    if (def.id === 6) {
      if (peerEvalSubmitted || items[6]?.status === "complete") return { status: "complete", badge: "Submitted", badgeVariant: "success" };
      return { status: "empty", badge: "Not started", badgeVariant: "neutral" };
    }
    // Items 7 & 8 — locked until 1-6 complete
    if (def.id === 7 || def.id === 8) {
      const allPrior = [1, 2, 3, 4, 5].every(id => items[id]?.status === "complete");
      const evalDone = peerEvalSubmitted || items[6]?.status === "complete";
      if (allPrior && evalDone) {
        return def.id === 7 ? { status: "complete", badge: "Released", badgeVariant: "success" } : { status: "pending", badge: "Available", badgeVariant: "warning" };
      }
      return { status: "locked", badge: "Locked", badgeVariant: "locked" };
    }
    // Items 1-5
    if (items[def.id]?.status === "complete") return { status: "complete", badge: "Complete", badgeVariant: "success" };
    return { status: "empty", badge: "Not started", badgeVariant: "neutral" };
  }

  const itemStates = ITEM_DEFS.map(def => ({ ...def, ...getItemState(def) }));
  const completedCount = itemStates.filter(i => i.status === "complete").length;
  const totalItems = ITEM_DEFS.length;
  const pct = Math.round((completedCount / totalItems) * 100);
  const groupNumber = group?.number || group?.id || 0;

  return (
    <PageShell className="max-w-[1280px] mx-auto space-y-6">
      {/* Header */}
      <FadeIn delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px, 4vw, 32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>
              Post-Defense Archive
            </h1>
            <span className="px-2.5 py-0.5 rounded-full" style={{ background: DT.blueDim, color: DT.blue, fontSize: 10, fontWeight: 600, fontFamily: FT.h }}>
              Finalization Phase
            </span>
          </div>
        </div>
      </FadeIn>

      <ContextualTip {...TIPS.archive} accent={DT.blue} accentDim={DT.blueDim} />

      {/* Hero Progress Card */}
      <FadeIn delay={100}>
        <div className="rounded-3xl overflow-hidden" style={{
          background: `linear-gradient(145deg, ${DT.raised} 0%, ${DT.elevated} 100%)`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowLg,
        }}>
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 lg:p-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.10)` }}>
              <Archive size={28} style={{ color: DT.blue }} />
            </div>
            <div className="shrink-0"><ProgressRingDark pct={pct} size={88} /></div>
            <div className="flex-1 text-center md:text-left">
              <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
                {pct === 100 ? "All requirements completed!" : "Final step before you're done!"}
              </h3>
              <p className="mt-1.5" style={{ fontSize: 14, color: DT.textSec, lineHeight: 1.6 }}>
                Complete all archive requirements to unlock your final grade and certificate.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div style={{ fontFamily: FT.h, fontSize: 36, fontWeight: 700, color: DT.textPri, lineHeight: 1 }}>
                {completedCount}<span style={{ color: DT.textDis }}>/{totalItems}</span>
              </div>
              <div style={{ fontSize: 11, color: DT.textTer, marginTop: 4 }}>items complete</div>
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: DT.blue, boxShadow: `0 0 12px ${DT.blueGlow}`, transition: "width 1.2s ease-out" }} />
          </div>
        </div>
      </FadeIn>

      {/* Archive Items List */}
      <FadeIn delay={200}>
        <div className="rounded-[20px] overflow-hidden" style={{
          background: `linear-gradient(145deg, ${DT.raised} 0%, ${DT.elevated} 100%)`,
          border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowMd,
        }}>
          <div className="flex items-center gap-3 px-6 lg:px-7 py-4" style={{ borderBottom: `1px solid ${DT.borderHair}`, background: DT.blueDim }}>
            <Shield size={14} style={{ color: DT.blue }} />
            <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 700, color: DT.textPri }}>Archive Requirements</span>
            <span className="ml-auto px-2.5 py-0.5 rounded-full" style={{ background: DT.yellowDim, color: DT.yellow, fontFamily: FT.h, fontSize: 10, fontWeight: 700 }}>
              {completedCount}/{totalItems}
            </span>
          </div>
          {itemStates.map((item, i) => (
            <ArchiveRow
              key={item.id}
              def={item}
              status={item.status}
              badgeLabel={item.badge}
              badgeVariant={item.badgeVariant}
              archiveItem={items[item.id]}
              groupNumber={groupNumber}
              index={i}
              onNavigate={onNavigate}
              onUpdate={fetchData}
            />
          ))}
        </div>
      </FadeIn>
    </PageShell>
  );
}
