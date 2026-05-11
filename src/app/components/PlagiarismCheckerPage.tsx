import { lazy, useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import {
  Shield, Upload, FileText, Search, AlertTriangle, CheckCircle2,
  ExternalLink, Trash2, BarChart3, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Info, Copy, Check, Sparkles,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { extractTextFromPDF as extractPdf } from "../lib/pdf-extract";
import { AIReportDisplay, AIAnalyzeButton } from "./AIAnalysisPanel";
import { Brain } from "lucide-react";

const ExportReportButton = lazy(() => import("./ReportExporter").then((m) => ({ default: m.ExportReportButton })));
const ExportAllButton = lazy(() => import("./ReportExporter").then((m) => ({ default: m.ExportAllButton })));
const RateLimitIndicator = lazy(() => import("./ReportExporter").then((m) => ({ default: m.RateLimitIndicator })));

/* ═══════════════════════════════════════════
   AI DETECTION CHECKER PAGE — Coordinator Tool
   Cross-group manuscript similarity analysis
   ═══════════════════════════════════════════ */

interface StoredManuscript {
  groupNumber: number;
  fileName: string;
  pageCount: number;
  wordCount: number;
  storedAt: string;
  storedBy: string;
}

interface MatchingPassage {
  sourcePassage: string;
  matchedPassage: string;
  similarity: number;
  matchedGroup?: number;
  matchedGroupName?: string;
}

interface Comparison {
  groupNumber: number;
  groupName: string;
  similarity: number;
  matchingPassages: MatchingPassage[];
  wordCount: number;
}

interface PlagiarismReport {
  id: number;
  groupNumber: number;
  overallSimilarity: number;
  comparisons: Comparison[];
  suspiciousPassages: MatchingPassage[];
  analyzedAt: string;
  comparedAgainst: number;
  message?: string;
}

/* ─── Similarity meter ring ─── */
function SimilarityMeter({ value, size = 120 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value > 30 ? DT.red : value > 15 ? DT.warning : DT.success;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={DT.borderSub} strokeWidth={6} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: FT.m, fontSize: size * 0.22, fontWeight: 800, color }}>{value.toFixed(1)}%</span>
        <span style={{ fontSize: 10, color: DT.textTer }}>similarity</span>
      </div>
    </div>
  );
}

/* ─── Shimmer skeleton ─── */
function Shimmer({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div
      className="rounded-lg animate-pulse"
      style={{ width: w, height: h, background: `linear-gradient(90deg, ${DT.raised} 25%, ${DT.elevated} 50%, ${DT.raised} 75%)` }}
    />
  );
}

/* ─── Google verify link ─── */
function GoogleVerifyLink({ text }: { text: string }) {
  const query = encodeURIComponent(`"${text.slice(0, 100)}"`);
  return (
    <a
      href={`https://www.google.com/search?q=${query}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold hover:opacity-80 transition-opacity"
      style={{ background: DT.blueDim, color: DT.blue, border: `1px solid ${DT.blueGlow}` }}
    >
      <Search size={11} /> Google Verify <ExternalLink size={10} />
    </a>
  );
}

/* ─── Copy button ─── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:opacity-80 transition"
      style={{ background: DT.hoverBg, color: DT.textSec }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Passage comparison card ─── */
function PassageCard({ passage, index }: { passage: MatchingPassage; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const simColor = passage.similarity > 70 ? DT.red : passage.similarity > 40 ? DT.warning : DT.yellow;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: DT.raised, border: `1px solid ${passage.similarity > 70 ? "rgba(248,113,113,0.20)" : DT.borderSub}` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
            style={{ background: withAlpha(simColor, 0.09), color: simColor }}
          >
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: DT.textPri }}>
              {passage.sourcePassage.slice(0, 80)}...
            </p>
            {passage.matchedGroupName && (
              <p className="text-xs mt-0.5" style={{ color: DT.textTer }}>
                Matches: {passage.matchedGroupName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: withAlpha(simColor, 0.09), color: simColor }}
          >
            {passage.similarity}%
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: DT.textTer }} /> : <ChevronDown size={14} style={{ color: DT.textTer }} />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-lg p-3" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.red }}>Source Passage</span>
              <div className="flex gap-1.5">
                <CopyBtn text={passage.sourcePassage} />
                <GoogleVerifyLink text={passage.sourcePassage} />
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DT.textSec, fontFamily: FT.b }}>
              "{passage.sourcePassage}"
            </p>
          </div>

          <div className="rounded-lg p-3" style={{ background: "rgba(255,209,0,0.03)", border: `1px solid rgba(255,209,0,0.08)` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.yellow }}>Matched Passage</span>
              <CopyBtn text={passage.matchedPassage} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DT.textSec, fontFamily: FT.b }}>
              "{passage.matchedPassage}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export function PlagiarismCheckerPage() {
  const [manuscripts, setManuscripts] = useState<StoredManuscript[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [reports, setReports] = useState<PlagiarismReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeReport, setActiveReport] = useState<PlagiarismReport | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState("");
  const [tab, setTab] = useState<"upload" | "reports" | "ai">("upload");
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiReports, setAiReports] = useState<any[]>([]);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Load data */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [msRes, grpRes, repRes, aiRes] = await Promise.all([
        apiFetch<any>("/plagiarism/manuscripts").catch(() => ({ manuscripts: [] })),
        apiFetch<any>("/groups").catch(() => ({ groups: [] })),
        apiFetch<any>("/plagiarism/reports").catch(() => ({ reports: [] })),
        apiFetch<any>("/plagiarism/ai-reports").catch(() => ({ reports: [] })),
      ]);
      setManuscripts(msRes.manuscripts || []);
      setGroups(grpRes.groups || []);
      setReports(repRes.reports || []);
      setAiReports(aiRes.reports || []);
      // Fetch rate limit status
      apiFetch<any>("/plagiarism/ai-rate-limit").then(rl => setRateLimit(rl)).catch(() => {});
    } catch (err) {
      console.error("Failed to load plagiarism data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* Handle PDF upload */
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    if (!selectedGroup) {
      toast.error("Please select a group first");
      return;
    }

    setUploading(true);
    setExtractionProgress("Reading PDF...");
    try {
      const { text, pageCount } = await extractPdf(file);
      if (text.length < 100) {
        toast.error("Could not extract sufficient text from the PDF. The file may be scanned/image-based.");
        setUploading(false);
        return;
      }
      setExtractedText(text);
      setExtractionProgress("Uploading to server...");

      await apiFetch("/plagiarism/store", {
        method: "POST",
        body: JSON.stringify({
          groupNumber: selectedGroup,
          text,
          fileName: file.name,
          pageCount,
        }),
      });

      toast.success(`Manuscript uploaded: ${text.split(/\s+/).length.toLocaleString()} words extracted from ${pageCount} pages`);
      loadData();
    } catch (err: any) {
      console.error("PDF extraction error:", err);
      toast.error(err.message || "Failed to process PDF");
    } finally {
      setUploading(false);
      setExtractionProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* Run analysis */
  const runAnalysis = async (groupNumber: number) => {
    setAnalyzing(true);
    try {
      const result = await apiFetch<PlagiarismReport>("/plagiarism/analyze", {
        method: "POST",
        body: JSON.stringify({ groupNumber }),
      });
      setActiveReport(result);
      setTab("reports");
      loadData();
      if (result.message) {
        toast.info(result.message);
      } else {
        toast.success(`Analysis complete: ${result.overallSimilarity.toFixed(1)}% max similarity`);
      }
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  /* Delete manuscript */
  const deleteManuscript = async (groupNumber: number) => {
    try {
      await apiFetch(`/plagiarism/manuscripts/${groupNumber}`, { method: "DELETE" });
      toast.success("Manuscript text deleted");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  /* Get severity label */
  const getSeverity = (sim: number) => {
    if (sim > 30) return { label: "HIGH", color: DT.red, bg: DT.redDim };
    if (sim > 15) return { label: "MODERATE", color: DT.warning, bg: DT.warningDim };
    if (sim > 5) return { label: "LOW", color: DT.yellow, bg: DT.yellowDim };
    return { label: "CLEAN", color: DT.success, bg: DT.successDim };
  };

  const groupsWithManuscripts = new Set(manuscripts.map(m => m.groupNumber));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${DT.purple}, ${DT.blue})` }}
            >
              <Shield size={20} color="#fff" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: FT.h, color: DT.textPri }}>
              AI Detection Checker
            </h1>
          </div>
          <p className="text-sm ml-[52px]" style={{ color: DT.textSec }}>
            Cross-group manuscript similarity analysis with passage-level detection
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("upload")}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === "upload" ? DT.blue : DT.raised,
              color: tab === "upload" ? "#fff" : DT.textSec,
              border: `1px solid ${tab === "upload" ? DT.blue : DT.borderSub}`,
            }}
          >
            <Upload size={14} className="inline mr-1.5 -mt-0.5" /> Upload & Scan
          </button>
          <button
            onClick={() => setTab("reports")}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === "reports" ? DT.blue : DT.raised,
              color: tab === "reports" ? "#fff" : DT.textSec,
              border: `1px solid ${tab === "reports" ? DT.blue : DT.borderSub}`,
            }}
          >
            <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" /> Reports ({reports.length})
          </button>
          <button
            onClick={() => setTab("ai")}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: tab === "ai" ? `linear-gradient(135deg, ${DT.purple}, ${DT.blue})` : DT.raised,
              color: tab === "ai" ? "#fff" : DT.textSec,
              border: `1px solid ${tab === "ai" ? DT.purple : DT.borderSub}`,
            }}
          >
            <Brain size={14} className="inline mr-1.5 -mt-0.5" /> AI Analysis
          </button>
          <ExportAllButton
            reportType="both"
            crossReports={reports}
            aiReports={aiReports}
            groups={groups}
          />
        </div>
      </div>

      {/* Info banner */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: DT.blueDim, border: `1px solid ${DT.blueGlow}` }}
      >
        <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: DT.blue }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: DT.blue }}>Internal Cross-Submission Checker</p>
          <p className="text-xs mt-0.5" style={{ color: DT.textSec }}>
            This tool compares manuscripts <strong>between groups within Hue We Are</strong> using n-gram similarity analysis.
            It detects copied passages across submissions. For external plagiarism detection (web/published papers),
            use the Google Verify links on flagged passages to spot-check manually.
          </p>
        </div>
      </div>

      {/* ─── UPLOAD & SCAN TAB ─── */}
      {tab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload section */}
          <div className="lg:col-span-3 space-y-5">
            {/* Group selector + Upload */}
            <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: DT.textPri, fontFamily: FT.h }}>
                Upload Manuscript PDF
              </h3>

              {/* Group selector */}
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-2" style={{ color: DT.textSec }}>
                  Select Group
                </label>
                <select
                  value={selectedGroup || ""}
                  onChange={(e) => setSelectedGroup(Number(e.target.value) || null)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: DT.raised,
                    color: DT.textPri,
                    border: `1px solid ${DT.borderDef}`,
                    fontFamily: FT.b,
                  }}
                >
                  <option value="">Choose a group...</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.number || g.id}>
                      Group {g.number || g.id} — {g.title || "Untitled"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                className="relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer hover:opacity-80 transition"
                style={{
                  borderColor: uploading ? DT.blue : DT.borderDef,
                  background: uploading ? DT.blueDim : DT.raised,
                }}
                onClick={() => !uploading && fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploading ? (
                  <div className="space-y-3">
                    <Loader2 size={32} className="mx-auto animate-spin" style={{ color: DT.blue }} />
                    <p className="text-sm font-semibold" style={{ color: DT.blue }}>{extractionProgress}</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto mb-3" style={{ color: DT.textTer }} />
                    <p className="text-sm font-semibold" style={{ color: DT.textPri }}>
                      Drop PDF here or click to browse
                    </p>
                    <p className="text-xs mt-1" style={{ color: DT.textTer }}>
                      Full manuscript PDF — text will be extracted automatically
                    </p>
                  </>
                )}
              </div>

              {extractedText && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: DT.successDim, border: `1px solid rgba(74,222,128,0.15)` }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: DT.success }} />
                    <span className="text-xs font-semibold" style={{ color: DT.success }}>
                      {extractedText.split(/\s+/).length.toLocaleString()} words extracted successfully
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick scan buttons */}
            {manuscripts.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
                <h3 className="text-sm font-bold mb-3" style={{ color: DT.textPri, fontFamily: FT.h }}>
                  <Sparkles size={14} className="inline mr-1.5 -mt-0.5" style={{ color: DT.yellow }} />
                  Quick Scan — Run Analysis
                </h3>
                <p className="text-xs mb-4" style={{ color: DT.textTer }}>
                  Select a stored manuscript to compare against all others
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {manuscripts.map((m) => {
                    const grp = groups.find((g: any) => (g.number || g.id) === m.groupNumber);
                    return (
                      <button
                        key={m.groupNumber}
                        disabled={analyzing}
                        onClick={() => runAnalysis(m.groupNumber)}
                        className="flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-80 transition"
                        style={{ background: DT.raised, border: `1px solid ${DT.borderSub}` }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: DT.purpleDim, color: DT.purple, fontSize: 12, fontWeight: 700 }}>
                          G{m.groupNumber}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: DT.textPri }}>
                            {grp?.title || `Group ${m.groupNumber}`}
                          </p>
                          <p className="text-[10px]" style={{ color: DT.textTer }}>
                            {m.wordCount.toLocaleString()} words · {m.pageCount} pages
                          </p>
                        </div>
                        {analyzing ? (
                          <Loader2 size={14} className="ml-auto animate-spin" style={{ color: DT.blue }} />
                        ) : (
                          <Search size={14} className="ml-auto flex-shrink-0" style={{ color: DT.textTer }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stored manuscripts sidebar */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: DT.textPri, fontFamily: FT.h }}>
                  <FileText size={14} className="inline mr-1.5 -mt-0.5" />
                  Stored Manuscripts
                </h3>
                <button onClick={loadData} className="p-1.5 rounded-lg hover:opacity-70 transition"
                  style={{ color: DT.textTer }}>
                  <RefreshCw size={14} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Shimmer key={i} h={52} />)}
                </div>
              ) : manuscripts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={28} className="mx-auto mb-2" style={{ color: DT.textDis }} />
                  <p className="text-xs" style={{ color: DT.textTer }}>
                    No manuscripts uploaded yet. Upload PDFs from at least 2 groups to start comparing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {manuscripts.map((m) => {
                    const grp = groups.find((g: any) => (g.number || g.id) === m.groupNumber);
                    return (
                      <div
                        key={m.groupNumber}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: DT.raised, border: `1px solid ${DT.borderHair}` }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: DT.blueDim, color: DT.blue, fontSize: 11, fontWeight: 700, fontFamily: FT.m }}>
                          G{m.groupNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: DT.textPri }}>
                            {grp?.title || `Group ${m.groupNumber}`}
                          </p>
                          <p className="text-[10px]" style={{ color: DT.textTer }}>
                            {m.wordCount.toLocaleString()} words · {m.fileName}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteManuscript(m.groupNumber)}
                          className="p-1.5 rounded-lg hover:opacity-70 transition flex-shrink-0"
                          style={{ color: DT.textTer }}
                          title="Remove manuscript"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg" style={{ background: DT.base }}>
                <p className="text-[10px] leading-relaxed" style={{ color: DT.textTer }}>
                  <strong style={{ color: DT.textSec }}>Tip:</strong> Upload manuscripts from all groups,
                  then run analysis on each one. The checker compares every group against every other group
                  using 4-gram similarity and passage-level matching.
                </p>
              </div>
            </div>

            {/* Stats card */}
            <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: DT.textPri, fontFamily: FT.h }}>
                Coverage
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ background: DT.raised }}>
                  <p className="text-lg font-bold" style={{ color: DT.blue, fontFamily: FT.m }}>
                    {manuscripts.length}
                  </p>
                  <p className="text-[10px]" style={{ color: DT.textTer }}>Manuscripts</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: DT.raised }}>
                  <p className="text-lg font-bold" style={{ color: DT.purple, fontFamily: FT.m }}>
                    {groups.length}
                  </p>
                  <p className="text-[10px]" style={{ color: DT.textTer }}>Total Groups</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: DT.raised }}>
                  <p className="text-lg font-bold" style={{ color: DT.success, fontFamily: FT.m }}>
                    {reports.length}
                  </p>
                  <p className="text-[10px]" style={{ color: DT.textTer }}>Reports</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: DT.raised }}>
                  <p className="text-lg font-bold" style={{ color: DT.yellow, fontFamily: FT.m }}>
                    {groups.length > 0 ? Math.round((manuscripts.length / groups.length) * 100) : 0}%
                  </p>
                  <p className="text-[10px]" style={{ color: DT.textTer }}>Coverage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI ANALYSIS TAB ─── */}
      {tab === "ai" && (
        <div className="space-y-6">
          {/* AI info banner */}
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: DT.purpleDim, border: "1px solid rgba(167,139,250,0.15)" }}
          >
            <Brain size={18} className="flex-shrink-0 mt-0.5" style={{ color: DT.purple }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: DT.purple }}>AI-Powered Deep Analysis</p>
              <p className="text-xs mt-0.5" style={{ color: DT.textSec }}>
                Goes beyond cross-submission matching. Uses GPT-4o-mini to detect <strong>AI-generated content</strong>,
                <strong> writing style inconsistencies</strong>, <strong>paraphrase patterns</strong>, and <strong>citation issues</strong>.
                Select a stored manuscript below to run AI analysis.
              </p>
            </div>
          </div>

          {/* Rate limit indicator */}
          {rateLimit && (
            <RateLimitIndicator
              remaining={rateLimit.remaining}
              limit={rateLimit.limit}
              resetInMs={rateLimit.resetInMs}
              globalRemaining={rateLimit.globalRemaining}
              globalLimit={rateLimit.globalLimit}
            />
          )}

          {/* Manuscript selector for AI analysis */}
          {manuscripts.length > 0 ? (
            <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: DT.textPri, fontFamily: FT.h }}>
                <Sparkles size={14} className="inline mr-1.5 -mt-0.5" style={{ color: DT.purple }} />
                Select Manuscript for AI Analysis
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {manuscripts.map((m) => {
                  const grp = groups.find((g: any) => (g.number || g.id) === m.groupNumber);
                  return (
                    <div
                      key={m.groupNumber}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: DT.raised, border: `1px solid ${DT.borderSub}` }}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: DT.purpleDim, color: DT.purple, fontSize: 12, fontWeight: 700 }}>
                        G{m.groupNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" style={{ color: DT.textPri }}>
                          {grp?.title || `Group ${m.groupNumber}`}
                        </p>
                        <p className="text-[10px]" style={{ color: DT.textTer }}>
                          {m.wordCount.toLocaleString()} words
                        </p>
                      </div>
                      <AIAnalyzeButton
                        groupNumber={m.groupNumber}
                        onResult={(report) => {
                          setAiReport(report);
                          loadData();
                          apiFetch<any>("/plagiarism/ai-rate-limit").then(rl => setRateLimit(rl)).catch(() => {});
                        }}
                        disabled={rateLimit?.remaining === 0}
                        compact
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <Brain size={32} className="mx-auto mb-2" style={{ color: DT.textDis }} />
              <p className="text-sm font-semibold" style={{ color: DT.textTer }}>No manuscripts available</p>
              <p className="text-xs mt-1" style={{ color: DT.textDis }}>
                Upload manuscripts in the "Upload & Scan" tab first, then return here for AI analysis.
              </p>
            </div>
          )}

          {/* Active AI report */}
          {aiReport && (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <ExportReportButton
                  type="ai"
                  report={aiReport}
                  groupName={groups.find((g: any) => (g.number || g.id) === aiReport.groupNumber)?.title}
                />
              </div>
              <AIReportDisplay report={aiReport} />
            </div>
          )}

          {/* Past AI reports */}
          {aiReports.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: DT.textPri, fontFamily: FT.h }}>
                <Brain size={14} className="inline mr-1.5 -mt-0.5" />
                Past AI Reports
              </h3>
              <div className="space-y-2">
                {aiReports.map((r: any) => {
                  const a = r.analysis;
                  const grp = groups.find((g: any) => (g.number || g.id) === r.groupNumber);
                  const verdictColor = a?.overallVerdict === "CLEAN" ? DT.success
                    : a?.overallVerdict === "HIGH_RISK" ? DT.red
                    : a?.overallVerdict === "MODERATE_RISK" ? DT.warning
                    : DT.yellow;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setAiReport(r)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl text-left hover:opacity-80 transition"
                      style={{
                        background: aiReport?.id === r.id ? DT.elevated : DT.raised,
                        border: `1px solid ${aiReport?.id === r.id ? DT.borderStrong : DT.borderHair}`,
                      }}
                    >
                      <div
                        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${withAlpha(DT.purple, 0.19)}, ${withAlpha(DT.blue, 0.19)})` }}
                      >
                        <Brain size={18} style={{ color: DT.purple }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: DT.textPri }}>
                          {r.groupNumber ? `Group ${r.groupNumber}` : "Direct Analysis"}
                          {grp?.title ? ` — ${grp.title}` : ""}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: DT.textTer }}>
                          {r.wordCount?.toLocaleString()} words · AI Score: {a?.academicIntegrityScore ?? "?"}/100 · {new Date(r.analyzedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{ background: withAlpha(verdictColor, 0.08), color: verdictColor }}
                      >
                        {a?.overallVerdict?.replace(/_/g, " ") || "?"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── REPORTS TAB ─── */}
      {tab === "reports" && (
        <div className="space-y-6">
          {/* Active report detail */}
          {activeReport && (
            <div className="rounded-xl overflow-hidden" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
              {/* Report header */}
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5"
                style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
                <SimilarityMeter value={activeReport.overallSimilarity} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold" style={{ color: DT.textPri, fontFamily: FT.h }}>
                      Group {activeReport.groupNumber} Analysis
                    </h3>
                    <ExportReportButton
                      type="cross-submission"
                      report={activeReport}
                      groupName={groups.find((g: any) => (g.number || g.id) === activeReport.groupNumber)?.title}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: DT.textSec }}>
                    Compared against {activeReport.comparedAgainst} other manuscript{activeReport.comparedAgainst !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: DT.textTer }}>
                    Analyzed: {new Date(activeReport.analyzedAt).toLocaleString()}
                  </p>

                  {/* Severity badge */}
                  {(() => {
                    const sev = getSeverity(activeReport.overallSimilarity);
                    return (
                      <span
                        className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: sev.bg, color: sev.color }}
                      >
                        {activeReport.overallSimilarity > 30 && <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />}
                        {activeReport.overallSimilarity <= 5 && <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />}
                        {sev.label} SIMILARITY
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Comparison bars */}
              {activeReport.comparisons.length > 0 && (
                <div className="p-5" style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DT.textTer }}>
                    Group-by-Group Comparison
                  </h4>
                  <div className="space-y-2">
                    {activeReport.comparisons.map((comp) => {
                      const sev = getSeverity(comp.similarity);
                      return (
                        <div key={comp.groupNumber} className="flex items-center gap-3">
                          <div className="w-16 text-right flex-shrink-0">
                            <span className="text-xs font-bold" style={{ color: DT.textSec, fontFamily: FT.m }}>
                              G{comp.groupNumber}
                            </span>
                          </div>
                          <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: DT.raised }}>
                            <div
                              className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                              style={{
                                width: `${Math.max(comp.similarity, 2)}%`,
                                background: `linear-gradient(90deg, ${withAlpha(sev.color, 0.2)}, ${sev.color})`,
                              }}
                            >
                              {comp.similarity > 5 && (
                                <span className="text-[10px] font-bold text-white">{comp.similarity.toFixed(1)}%</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs w-12 text-right flex-shrink-0" style={{ color: sev.color, fontWeight: 700, fontFamily: FT.m }}>
                            {comp.similarity.toFixed(1)}%
                          </span>
                          <span className="text-[10px] flex-shrink-0 w-12 text-right" style={{ color: DT.textTer }}>
                            {comp.matchingPassages.length} hits
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suspicious passages */}
              {activeReport.suspiciousPassages.length > 0 && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={14} style={{ color: DT.warning }} />
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: DT.textTer }}>
                      Suspicious Passages ({activeReport.suspiciousPassages.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {activeReport.suspiciousPassages.map((p, i) => (
                      <PassageCard key={i} passage={p} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {activeReport.suspiciousPassages.length === 0 && activeReport.comparisons.length > 0 && (
                <div className="p-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-2" style={{ color: DT.success }} />
                  <p className="text-sm font-semibold" style={{ color: DT.success }}>No suspicious passages detected</p>
                  <p className="text-xs mt-1" style={{ color: DT.textTer }}>
                    No sentence-level matches above the 35% threshold were found between this manuscript and others.
                  </p>
                </div>
              )}

              {activeReport.message && (
                <div className="p-5">
                  <div className="p-4 rounded-xl" style={{ background: DT.yellowDim, border: `1px solid rgba(255,209,0,0.12)` }}>
                    <p className="text-xs" style={{ color: DT.yellow }}>
                      <Info size={12} className="inline mr-1 -mt-0.5" />
                      {activeReport.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Past reports list */}
          <div className="rounded-xl p-5" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: DT.textPri, fontFamily: FT.h }}>
              <BarChart3 size={14} className="inline mr-1.5 -mt-0.5" />
              All Analysis Reports
            </h3>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Shimmer key={i} h={56} />)}</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 size={28} className="mx-auto mb-2" style={{ color: DT.textDis }} />
                <p className="text-xs" style={{ color: DT.textTer }}>
                  No reports yet. Upload manuscripts and run an analysis to generate reports.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((r) => {
                  const sev = getSeverity(r.overallSimilarity);
                  const grp = groups.find((g: any) => (g.number || g.id) === r.groupNumber);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveReport(r)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl text-left hover:opacity-80 transition"
                      style={{
                        background: activeReport?.id === r.id ? DT.elevated : DT.raised,
                        border: `1px solid ${activeReport?.id === r.id ? DT.borderStrong : DT.borderHair}`,
                      }}
                    >
                      <div className="flex-shrink-0">
                        <SimilarityMeter value={r.overallSimilarity} size={52} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: DT.textPri }}>
                          Group {r.groupNumber} {grp?.title ? `— ${grp.title}` : ""}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: DT.textTer }}>
                          vs {r.comparedAgainst} groups · {r.suspiciousPassages?.length || 0} flagged passages · {new Date(r.analyzedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className="px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{ background: sev.bg, color: sev.color }}
                      >
                        {sev.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
