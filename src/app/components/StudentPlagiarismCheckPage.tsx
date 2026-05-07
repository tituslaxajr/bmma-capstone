import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Upload, FileText, Search, AlertTriangle, CheckCircle2,
  ExternalLink, ChevronDown, ChevronUp,
  Loader2, Info, Copy, Check, Sparkles,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { extractTextFromPDF } from "../lib/pdf-extract";
import { AIAnalyzeFromText, AIReportDisplay } from "./AIAnalysisPanel";
import { ExportReportButton, RateLimitIndicator } from "./ReportExporter";

/* ═══════════════════════════════════════════
   STUDENT AI DETECTION CHECK PAGE
   Upload your manuscript PDF to check for similarity
   ═══════════════════════════════════════════ */

interface MatchingPassage {
  sourcePassage: string;
  matchedPassage: string;
  similarity: number;
  matchedGroupName?: string;
}

interface Comparison {
  groupNumber: number;
  groupName: string;
  similarity: number;
  matchingPassages: MatchingPassage[];
}

interface SelfCheckResult {
  groupNumber: number;
  groupName: string;
  overallSimilarity: number;
  comparisons: Comparison[];
  suspiciousPassages: MatchingPassage[];
  analyzedAt: string;
  comparedAgainst: number;
  wordCount: number;
  message?: string;
}

/* ─── Similarity ring ─── */
function SimilarityRing({ value, size = 100 }: { value: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value > 30 ? DT.red : value > 15 ? DT.warning : DT.success;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={DT.borderSub} strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: FT.m, fontSize: size * 0.24, fontWeight: 800, color }}>{value.toFixed(1)}%</span>
        <span style={{ fontSize: 9, color: DT.textTer }}>similarity</span>
      </div>
    </div>
  );
}

/* ─── Google verify ─── */
function GoogleVerify({ text }: { text: string }) {
  const query = encodeURIComponent(`"${text.slice(0, 100)}"`);
  return (
    <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold hover:opacity-80 transition-opacity"
      style={{ background: DT.blueDim, color: DT.blue, border: `1px solid ${DT.blueGlow}` }}>
      <Search size={10} /> Google Verify <ExternalLink size={9} />
    </a>
  );
}

/* ─── Copy button ─── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:opacity-80 transition"
      style={{ background: DT.hoverBg, color: DT.textSec }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─── Passage card ─── */
function PassageCard({ passage, index }: { passage: MatchingPassage; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const simColor = passage.similarity > 70 ? DT.red : passage.similarity > 40 ? DT.warning : DT.yellow;
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: DT.raised, border: `1px solid ${passage.similarity > 70 ? "rgba(248,113,113,0.20)" : DT.borderSub}` }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
            style={{ background: withAlpha(simColor, 0.09), color: simColor }}>{index + 1}</div>
          <p className="text-xs font-medium truncate" style={{ color: DT.textPri }}>
            {passage.sourcePassage.slice(0, 80)}...
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: withAlpha(simColor, 0.09), color: simColor }}>
            {passage.similarity}%
          </span>
          {expanded ? <ChevronUp size={13} style={{ color: DT.textTer }} /> : <ChevronDown size={13} style={{ color: DT.textTer }} />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2.5">
          <div className="rounded-lg p-3" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.red }}>Your Passage</span>
              <div className="flex gap-1.5">
                <CopyBtn text={passage.sourcePassage} />
                <GoogleVerify text={passage.sourcePassage} />
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DT.textSec, fontFamily: FT.b }}>"{passage.sourcePassage}"</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(255,209,0,0.03)", border: `1px solid rgba(255,209,0,0.08)` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.yellow }}>Similar Passage Found</span>
              <CopyBtn text={passage.matchedPassage} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: DT.textSec, fontFamily: FT.b }}>"{passage.matchedPassage}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export function StudentPlagiarismCheckPage() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SelfCheckResult | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [extractionProgress, setExtractionProgress] = useState("");
  const [lastExtractedText, setLastExtractedText] = useState("");
  const [lastWordCount, setLastWordCount] = useState(0);
  const [aiReport, setAiReport] = useState<any>(null);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/plagiarism/my-status").catch(() => null);
      setStatus(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadStatus();
    apiFetch<any>("/plagiarism/ai-rate-limit").then(rl => setRateLimit(rl)).catch(() => {});
  }, [loadStatus]);

  /* Handle upload + check */
  const handleUploadAndCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Please upload a PDF file"); return; }

    setChecking(true);
    setExtractionProgress("Reading PDF...");
    try {
      const { text, pageCount } = await extractTextFromPDF(file, setExtractionProgress);
      if (text.length < 100) {
        toast.error("Could not extract enough text. The PDF may be scanned/image-based.");
        setChecking(false); return;
      }

      setLastExtractedText(text);
      setLastWordCount(text.split(/\s+/).length);
      setExtractionProgress("Running similarity check...");
      const res = await apiFetch<SelfCheckResult>("/plagiarism/self-check", {
        method: "POST",
        body: JSON.stringify({ text, fileName: file.name, pageCount }),
      });

      setResult(res);
      loadStatus();

      if (res.message) {
        toast.info(res.message);
      } else {
        const severity = res.overallSimilarity > 30 ? "warning" : "success";
        if (severity === "warning") {
          toast.warning(`${res.overallSimilarity.toFixed(1)}% similarity detected — review flagged passages`);
        } else {
          toast.success(`Self-check complete: ${res.overallSimilarity.toFixed(1)}% max similarity`);
        }
      }
    } catch (err: any) {
      console.error("Self-check error:", err);
      toast.error(err.message || "Self-check failed");
    } finally {
      setChecking(false);
      setExtractionProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const getSeverity = (sim: number) => {
    if (sim > 30) return { label: "HIGH", color: DT.red, bg: DT.redDim, desc: "Significant overlap — review flagged passages." };
    if (sim > 15) return { label: "MODERATE", color: DT.warning, bg: DT.warningDim, desc: "Some similar sections — check citations." };
    if (sim > 5) return { label: "LOW", color: DT.yellow, bg: DT.yellowDim, desc: "Minor similarities — likely common phrasing." };
    return { label: "CLEAN", color: DT.success, bg: DT.successDim, desc: "No significant overlap found." };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${DT.blue}, ${DT.purple})` }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: FT.h, color: DT.textPri }}>
              AI Detection Check
            </h1>
            <p className="text-xs" style={{ color: DT.textSec }}>
              Check your manuscript before submission
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: DT.blueDim, border: `1px solid ${DT.blueGlow}` }}>
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: DT.blue }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: DT.blue }}>How it works</p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: DT.textSec }}>
            Upload your PDF → n-gram comparison against all submissions → anonymous results.
            Use <strong>Google Verify</strong> links to check external sources.
          </p>
        </div>
      </div>

      {/* Previous manuscript status */}
      {!loading && status?.hasManuscript && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
          <FileText size={16} style={{ color: DT.success }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold" style={{ color: DT.textPri }}>
              Previous upload: {status.manuscript.fileName}
            </p>
            <p className="text-[10px]" style={{ color: DT.textTer }}>
              {status.manuscript.wordCount?.toLocaleString()} words · {status.manuscript.pageCount} pages ·
              Uploaded by {status.manuscript.storedBy} on {new Date(status.manuscript.storedAt).toLocaleDateString()}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: DT.successDim, color: DT.success }}>
            Stored
          </span>
        </div>
      )}

      {/* Upload zone */}
      <div className="rounded-xl p-6" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: DT.textPri, fontFamily: FT.h }}>
          <Upload size={14} className="inline mr-1.5 -mt-0.5" />
          {result ? "Re-check with Updated Manuscript" : "Upload & Check"}
        </h3>

        <div
          className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer hover:opacity-80 transition"
          style={{
            borderColor: checking ? DT.blue : DT.borderDef,
            background: checking ? DT.blueDim : DT.raised,
          }}
          onClick={() => !checking && fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleUploadAndCheck} className="hidden" />
          {checking ? (
            <div className="space-y-3">
              <Loader2 size={28} className="mx-auto animate-spin" style={{ color: DT.blue }} />
              <p className="text-sm font-semibold" style={{ color: DT.blue }}>{extractionProgress}</p>
              <p className="text-[10px]" style={{ color: DT.textTer }}>This may take a moment for large documents...</p>
            </div>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-2" style={{ color: DT.textTer }} />
              <p className="text-sm font-semibold" style={{ color: DT.textPri }}>
                Click to upload your manuscript PDF
              </p>
              <p className="text-xs mt-1" style={{ color: DT.textTer }}>
                Text will be extracted and compared against all other group submissions
              </p>
            </>
          )}
        </div>
      </div>

      {/* ─── RESULTS ─── */}
      {result && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="rounded-xl overflow-hidden" style={{ background: DT.dark, border: `1px solid ${DT.borderSub}` }}>
            <div className="p-5 flex flex-col sm:flex-row items-center gap-5"
              style={{ borderBottom: `1px solid ${DT.borderSub}` }}>
              <SimilarityRing value={result.overallSimilarity} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold" style={{ color: DT.textPri, fontFamily: FT.h }}>
                    {result.groupName}
                  </h3>
                  <ExportReportButton
                    type="cross-submission"
                    report={{
                      id: 0,
                      groupNumber: result.groupNumber,
                      overallSimilarity: result.overallSimilarity,
                      comparisons: result.comparisons,
                      suspiciousPassages: result.suspiciousPassages,
                      analyzedAt: result.analyzedAt,
                      comparedAgainst: result.comparedAgainst,
                      message: result.message,
                    }}
                    groupName={result.groupName}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: DT.textSec }}>
                  {result.wordCount?.toLocaleString()} words compared against {result.comparedAgainst} other manuscript{result.comparedAgainst !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: DT.textTer }}>
                  Checked: {new Date(result.analyzedAt).toLocaleString()}
                </p>

                {(() => {
                  const sev = getSeverity(result.overallSimilarity);
                  return (
                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: sev.bg, color: sev.color }}>
                        {result.overallSimilarity > 30 && <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />}
                        {result.overallSimilarity <= 5 && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                        {sev.label}
                      </span>
                      <p className="text-[11px] mt-1.5" style={{ color: DT.textSec }}>{sev.desc}</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Comparison bars */}
            {result.comparisons.length > 0 && (
              <div className="p-5" style={{ borderBottom: result.suspiciousPassages.length > 0 ? `1px solid ${DT.borderSub}` : undefined }}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: DT.textTer }}>
                  Similarity by Group (Anonymized)
                </h4>
                <div className="space-y-2">
                  {result.comparisons.map((comp, idx) => {
                    const sev = getSeverity(comp.similarity);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-10 flex-shrink-0" style={{ color: DT.textTer, fontFamily: FT.m }}>
                          #{idx + 1}
                        </span>
                        <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: DT.raised }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.max(comp.similarity, 1.5)}%`, background: `linear-gradient(90deg, ${withAlpha(sev.color, 0.2)}, ${sev.color})` }} />
                        </div>
                        <span className="text-xs w-14 text-right flex-shrink-0 font-bold"
                          style={{ color: sev.color, fontFamily: FT.m }}>
                          {comp.similarity.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flagged passages */}
            {result.suspiciousPassages.length > 0 && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} style={{ color: DT.warning }} />
                  <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DT.textTer }}>
                    Flagged Passages ({result.suspiciousPassages.length})
                  </h4>
                </div>
                <p className="text-[10px] mb-3" style={{ color: DT.textTer }}>
                  These passages were found to be similar to other submitted manuscripts. Click to expand and use Google Verify to check external sources.
                </p>
                <div className="space-y-2">
                  {result.suspiciousPassages.map((p, i) => (
                    <PassageCard key={i} passage={p} index={i} />
                  ))}
                </div>
              </div>
            )}

            {result.suspiciousPassages.length === 0 && result.comparisons.length > 0 && (
              <div className="p-6 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: DT.success }} />
                <p className="text-sm font-semibold" style={{ color: DT.success }}>No flagged passages</p>
                <p className="text-[11px] mt-1" style={{ color: DT.textTer }}>
                  No sentence-level matches above the threshold were found.
                </p>
              </div>
            )}

            {result.message && (
              <div className="p-5">
                <div className="p-3 rounded-xl" style={{ background: DT.yellowDim, border: `1px solid rgba(255,209,0,0.12)` }}>
                  <p className="text-xs" style={{ color: DT.yellow }}>
                    <Info size={11} className="inline mr-1 -mt-0.5" />
                    {result.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── AI DEEP ANALYSIS ─── */}
      {rateLimit && (
        <RateLimitIndicator
          remaining={rateLimit.remaining}
          limit={rateLimit.limit}
          resetInMs={rateLimit.resetInMs}
          globalRemaining={rateLimit.globalRemaining}
          globalLimit={rateLimit.globalLimit}
        />
      )}
      <AIAnalyzeFromText
        text={lastExtractedText}
        wordCount={lastWordCount}
        onResult={(report) => {
          setAiReport(report);
          apiFetch<any>("/plagiarism/ai-rate-limit").then(rl => setRateLimit(rl)).catch(() => {});
        }}
        disabled={!lastExtractedText || rateLimit?.remaining === 0}
      />

      {aiReport && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <ExportReportButton type="ai" report={aiReport} />
          </div>
          <AIReportDisplay report={aiReport} />
        </div>
      )}

      {/* Tip card */}
      <div className="rounded-xl p-4" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
        <div className="flex items-start gap-2.5">
          <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: DT.yellow }} />
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: DT.textPri }}>Tips for a Clean Manuscript</p>
            <ul className="text-[11px] space-y-0.5 list-disc pl-3" style={{ color: DT.textSec }}>
              <li>Always paraphrase in your own words — don't copy-paste from references</li>
              <li>Use proper APA citations for all borrowed ideas, even if paraphrased</li>
              <li>Run this self-check before final submission to catch unintentional overlap</li>
              <li>Use the Google Verify link to check flagged passages against web sources</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}