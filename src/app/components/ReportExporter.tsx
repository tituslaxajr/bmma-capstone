import { useState } from "react";
import { Download, FileText, Table2, Loader2, ChevronDown } from "lucide-react";
import { DT, FT } from "./cinematic-tokens";
import { toast } from "sonner";
// jspdf and jspdf-autotable loaded dynamically on demand (avoid static import failures)

/* ═══════════════════════════════════════════
   REPORT EXPORTER — PDF & CSV Export
   For both cross-submission and AI analysis reports
   ═══════════════════════════════════════════ */

/* ─── Types ─── */
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
  wordCount?: number;
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

interface AIFlag {
  type: string;
  severity: string;
  description: string;
  excerpt: string;
  recommendation: string;
}

interface AISection {
  title: string;
  aiLikelihood: string;
  styleNote: string;
  flaggedExcerpt: string | null;
  concern: string | null;
}

interface AIAnalysis {
  aiGeneratedScore: number;
  styleConsistencyScore: number;
  academicIntegrityScore: number;
  overallVerdict: string;
  verdictSummary: string;
  sections: AISection[];
  flags: AIFlag[];
  writingProfile: {
    vocabularyLevel: string;
    sentenceComplexity: string;
    toneFormality: string;
    citationStyle: string;
  };
  recommendations: string[];
}

interface AIReport {
  id: number;
  groupNumber: number | null;
  wordCount: number;
  analysis: AIAnalysis;
  analyzedAt: string;
  model: string;
}

/* ─── Helpers ─── */
function sanitizeCSV(str: string): string {
  if (!str) return "";
  const s = String(str).replace(/"/g, '""');
  return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s;
}

function downloadBlob(content: string | Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ═══════════════════════════════════════════
   CROSS-SUBMISSION REPORT EXPORTS
   ═══════════════════════════════════════════ */

function exportCrossSubmissionCSV(report: PlagiarismReport, groupName?: string) {
  const lines: string[] = [];
  const label = groupName || `Group ${report.groupNumber}`;

  // Header
  lines.push("Hue We Are - Cross-Submission AI Detection Report");
  lines.push(`Group,${sanitizeCSV(label)}`);
  lines.push(`Overall Similarity,${report.overallSimilarity.toFixed(1)}%`);
  lines.push(`Compared Against,${report.comparedAgainst} groups`);
  lines.push(`Analyzed At,${formatDate(report.analyzedAt)}`);
  if (report.message) lines.push(`Note,${sanitizeCSV(report.message)}`);
  lines.push("");

  // Comparison table
  lines.push("--- Group-by-Group Comparison ---");
  lines.push("Group,Similarity %,Matching Passages");
  for (const comp of report.comparisons) {
    lines.push(`${sanitizeCSV(comp.groupName || `Group ${comp.groupNumber}`)},${comp.similarity.toFixed(1)},${comp.matchingPassages.length}`);
  }
  lines.push("");

  // Suspicious passages
  if (report.suspiciousPassages.length > 0) {
    lines.push("--- Flagged Passages ---");
    lines.push("Index,Similarity %,Matched Group,Source Passage,Matched Passage");
    report.suspiciousPassages.forEach((p, i) => {
      lines.push(
        `${i + 1},${p.similarity},${sanitizeCSV(p.matchedGroupName || "N/A")},${sanitizeCSV(p.sourcePassage)},${sanitizeCSV(p.matchedPassage)}`
      );
    });
  }

  downloadBlob(lines.join("\n"), `ai-detection-report-group${report.groupNumber}-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  toast.success("CSV report downloaded");
}

async function exportCrossSubmissionPDF(report: PlagiarismReport, groupName?: string) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const label = groupName || `Group ${report.groupNumber}`;
  const severity = report.overallSimilarity > 30 ? "HIGH" : report.overallSimilarity > 15 ? "MODERATE" : report.overallSimilarity > 5 ? "LOW" : "CLEAN";

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Hue We Are - AI Detection Report", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Cross-Submission Similarity Analysis", 14, 29);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 34);

  // Summary box
  doc.setDrawColor(180);
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, 40, 182, 32, 3, 3, "FD");

  doc.setTextColor(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(label, 20, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Overall Similarity: ${report.overallSimilarity.toFixed(1)}%  |  Severity: ${severity}`, 20, 57);
  doc.text(`Compared against ${report.comparedAgainst} group(s)  |  Analyzed: ${formatDate(report.analyzedAt)}`, 20, 63);

  if (report.message) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Note: ${report.message}`, 20, 69);
  }

  let yPos = report.message ? 80 : 78;

  // Comparison table
  if (report.comparisons.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Group-by-Group Comparison", 14, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [["Group", "Similarity %", "Matching Passages", "Severity"]],
      body: report.comparisons.map((comp) => {
        const sev = comp.similarity > 30 ? "HIGH" : comp.similarity > 15 ? "MODERATE" : comp.similarity > 5 ? "LOW" : "CLEAN";
        return [
          comp.groupName || `Group ${comp.groupNumber}`,
          comp.similarity.toFixed(1) + "%",
          String(comp.matchingPassages.length),
          sev,
        ];
      }),
      theme: "striped",
      headStyles: { fillColor: [50, 60, 100], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Flagged passages
  if (report.suspiciousPassages.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(`Flagged Passages (${report.suspiciousPassages.length})`, 14, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Sim %", "Matched Group", "Source Excerpt", "Matched Excerpt"]],
      body: report.suspiciousPassages.map((p, i) => [
        String(i + 1),
        p.similarity + "%",
        p.matchedGroupName || "N/A",
        p.sourcePassage.slice(0, 120) + (p.sourcePassage.length > 120 ? "..." : ""),
        p.matchedPassage.slice(0, 120) + (p.matchedPassage.length > 120 ? "..." : ""),
      ]),
      theme: "striped",
      headStyles: { fillColor: [50, 60, 100], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 15 },
        2: { cellWidth: 28 },
        3: { cellWidth: 62 },
        4: { cellWidth: 62 },
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(
      `Hue We Are AI Detection Report - ${label} - Page ${i}/${pageCount}`,
      105, 290, { align: "center" }
    );
  }

  doc.save(`ai-detection-report-group${report.groupNumber}-${Date.now()}.pdf`);
  toast.success("PDF report downloaded");
}

/* ═══════════════════════════════════════════
   AI ANALYSIS REPORT EXPORTS
   ═══════════════════════════════════════════ */

function exportAIReportCSV(report: AIReport) {
  const a = report.analysis;
  const lines: string[] = [];
  const label = report.groupNumber ? `Group ${report.groupNumber}` : "Direct Analysis";

  lines.push("Hue We Are - Cross-Submission AI Detection Report");
  lines.push(`Group,${sanitizeCSV(label)}`);
  lines.push(`Word Count,${report.wordCount}`);
  lines.push(`Model,${report.model}`);
  lines.push(`Analyzed At,${formatDate(report.analyzedAt)}`);
  lines.push("");

  // Scores
  lines.push("--- Scores ---");
  lines.push(`AI-Generated Likelihood,${a.aiGeneratedScore}/100`);
  lines.push(`Style Consistency,${a.styleConsistencyScore}/100`);
  lines.push(`Academic Integrity,${a.academicIntegrityScore}/100`);
  lines.push(`Overall Verdict,${a.overallVerdict.replace(/_/g, " ")}`);
  lines.push(`Summary,${sanitizeCSV(a.verdictSummary)}`);
  lines.push("");

  // Writing profile
  lines.push("--- Writing Profile ---");
  lines.push(`Vocabulary Level,${a.writingProfile.vocabularyLevel}`);
  lines.push(`Sentence Complexity,${a.writingProfile.sentenceComplexity}`);
  lines.push(`Tone & Formality,${a.writingProfile.toneFormality}`);
  lines.push(`Citation Style,${a.writingProfile.citationStyle}`);
  lines.push("");

  // Sections
  if (a.sections?.length > 0) {
    lines.push("--- Section Analysis ---");
    lines.push("Section,AI Likelihood,Style Note,Concern");
    for (const s of a.sections) {
      lines.push(`${sanitizeCSV(s.title)},${s.aiLikelihood},${sanitizeCSV(s.styleNote)},${sanitizeCSV(s.concern || "None")}`);
    }
    lines.push("");
  }

  // Flags
  if (a.flags?.length > 0) {
    lines.push("--- Flagged Concerns ---");
    lines.push("Type,Severity,Description,Excerpt,Recommendation");
    for (const f of a.flags) {
      lines.push(
        `${f.type},${f.severity},${sanitizeCSV(f.description)},${sanitizeCSV(f.excerpt)},${sanitizeCSV(f.recommendation)}`
      );
    }
    lines.push("");
  }

  // Recommendations
  if (a.recommendations?.length > 0) {
    lines.push("--- Recommendations ---");
    a.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1},${sanitizeCSV(rec)}`);
    });
  }

  downloadBlob(lines.join("\n"), `ai-detection-report-group${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  toast.success("CSV report downloaded");
}

async function exportAIReportPDF(report: AIReport) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const a = report.analysis;
  const label = report.groupNumber ? `Group ${report.groupNumber}` : "Direct Analysis";
  const verdictLabel = a.overallVerdict.replace(/_/g, " ");

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Hue We Are - AI Detection Report", 14, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Powered by GPT-4o-mini Academic Integrity Analysis", 14, 29);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 34);

  // Summary box
  doc.setDrawColor(180);
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(14, 40, 182, 35, 3, 3, "FD");

  doc.setTextColor(30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${label}  |  ${report.wordCount.toLocaleString()} words`, 20, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Verdict: ${verdictLabel}`, 20, 57);
  doc.text(`AI Score: ${a.aiGeneratedScore}/100  |  Style: ${a.styleConsistencyScore}/100  |  Integrity: ${a.academicIntegrityScore}/100`, 20, 63);

  doc.setFontSize(9);
  doc.setTextColor(80);
  const splitSummary = doc.splitTextToSize(a.verdictSummary, 170);
  doc.text(splitSummary, 20, 70);

  let yPos = 82;

  // Writing profile table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("Writing Profile", 14, yPos);
  yPos += 3;

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Assessment"]],
    body: [
      ["Vocabulary Level", a.writingProfile.vocabularyLevel.replace(/_/g, " ")],
      ["Sentence Complexity", a.writingProfile.sentenceComplexity.replace(/_/g, " ")],
      ["Tone & Formality", a.writingProfile.toneFormality.replace(/_/g, " ")],
      ["Citation Style", a.writingProfile.citationStyle.replace(/_/g, " ")],
    ],
    theme: "grid",
    headStyles: { fillColor: [80, 60, 140], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    tableWidth: 100,
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Section analysis
  if (a.sections?.length > 0) {
    if (yPos > 230) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(`Section-by-Section Analysis (${a.sections.length})`, 14, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [["Section", "AI Likelihood", "Style Note", "Concern"]],
      body: a.sections.map((s) => [
        s.title,
        s.aiLikelihood,
        s.styleNote.slice(0, 100) + (s.styleNote.length > 100 ? "..." : ""),
        s.concern?.slice(0, 80) || "None",
      ]),
      theme: "striped",
      headStyles: { fillColor: [80, 60, 140], fontSize: 8.5, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Flags
  if (a.flags?.length > 0) {
    if (yPos > 220) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(`Flagged Concerns (${a.flags.length})`, 14, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [["Type", "Severity", "Description", "Excerpt", "Recommendation"]],
      body: a.flags.map((f) => [
        f.type.replace(/_/g, " "),
        f.severity,
        f.description.slice(0, 80) + (f.description.length > 80 ? "..." : ""),
        f.excerpt.slice(0, 60) + (f.excerpt.length > 60 ? "..." : ""),
        f.recommendation.slice(0, 80) + (f.recommendation.length > 80 ? "..." : ""),
      ]),
      theme: "striped",
      headStyles: { fillColor: [180, 60, 60], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Recommendations
  if (a.recommendations?.length > 0) {
    if (yPos > 240) { doc.addPage(); yPos = 20; }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text("Recommendations", 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const rec of a.recommendations) {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      const lines = doc.splitTextToSize(`- ${rec}`, 175);
      doc.text(lines, 18, yPos);
      yPos += lines.length * 5 + 2;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(
      `Hue We Are AI Detection Report - ${label} - Page ${i}/${pageCount}`,
      105, 290, { align: "center" }
    );
  }

  doc.save(`ai-detection-report-group${label.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
  toast.success("PDF report downloaded");
}

/* ═══════════════════════════════════════════
   BATCH EXPORT (Multiple Reports)
   ═══════════════════════════════════════════ */

function exportAllCrossSubmissionCSV(reports: PlagiarismReport[], groups: any[]) {
  const lines: string[] = [];

  lines.push("Hue We Are - All Cross-Submission Reports (Summary)");
  lines.push(`Total Reports,${reports.length}`);
  lines.push(`Exported At,${formatDate(new Date().toISOString())}`);
  lines.push("");

  lines.push("Group,Overall Similarity %,Severity,Compared Against,Flagged Passages,Analyzed At");
  for (const r of reports) {
    const grp = groups.find((g: any) => (g.number || g.id) === r.groupNumber);
    const severity = r.overallSimilarity > 30 ? "HIGH" : r.overallSimilarity > 15 ? "MODERATE" : r.overallSimilarity > 5 ? "LOW" : "CLEAN";
    lines.push(
      `${sanitizeCSV(grp?.title || `Group ${r.groupNumber}`)},${r.overallSimilarity.toFixed(1)},${severity},${r.comparedAgainst},${r.suspiciousPassages?.length || 0},${formatDate(r.analyzedAt)}`
    );
  }

  downloadBlob(lines.join("\n"), `all-ai-detection-cross-reports-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  toast.success("All reports exported as CSV");
}

function exportAllAIReportsCSV(reports: AIReport[], groups: any[]) {
  const lines: string[] = [];

  lines.push("Hue We Are - All AI Detection Reports (Summary)");
  lines.push(`Total Reports,${reports.length}`);
  lines.push(`Exported At,${formatDate(new Date().toISOString())}`);
  lines.push("");

  lines.push("Group,Words,AI Score,Style Score,Integrity Score,Verdict,Flags,Analyzed At,Model");
  for (const r of reports) {
    const a = r.analysis;
    const grp = groups.find((g: any) => (g.number || g.id) === r.groupNumber);
    lines.push(
      `${sanitizeCSV(grp?.title || (r.groupNumber ? `Group ${r.groupNumber}` : "Direct"))},${r.wordCount},${a?.aiGeneratedScore ?? "?"},${a?.styleConsistencyScore ?? "?"},${a?.academicIntegrityScore ?? "?"},${a?.overallVerdict?.replace(/_/g, " ") || "?"},${a?.flags?.length ?? 0},${formatDate(r.analyzedAt)},${r.model}`
    );
  }

  downloadBlob(lines.join("\n"), `all-ai-detection-cross-reports-${Date.now()}.csv`, "text/csv;charset=utf-8;");
  toast.success("All reports exported as CSV");
}

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */

/* Single report export dropdown */
export function ExportReportButton({ type, report, groupName }: {
  type: "cross-submission";
  report: PlagiarismReport;
  groupName?: string;
} | {
  type: "ai";
  report: AIReport;
  groupName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "pdf" | "csv") => {
    setExporting(true);
    try {
      if (type === "cross-submission") {
        if (format === "pdf") await exportCrossSubmissionPDF(report as PlagiarismReport, groupName);
        else exportCrossSubmissionCSV(report as PlagiarismReport, groupName);
      } else {
        if (format === "pdf") await exportAIReportPDF(report as AIReport);
        else exportAIReportCSV(report as AIReport);
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Export failed — check console for details");
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition disabled:opacity-40"
        style={{ background: DT.raised, color: DT.textSec, border: `1px solid ${DT.borderSub}` }}
      >
        {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        Export
        <ChevronDown size={10} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg min-w-[160px]"
            style={{ background: DT.elevated, border: `1px solid ${DT.borderDef}` }}
          >
            <button
              onClick={() => handleExport("pdf")}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium hover:opacity-80 transition"
              style={{ color: DT.textPri, borderBottom: `1px solid ${DT.borderHair}` }}
            >
              <FileText size={13} style={{ color: DT.red }} />
              Export as PDF
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium hover:opacity-80 transition"
              style={{ color: DT.textPri }}
            >
              <Table2 size={13} style={{ color: DT.success }} />
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* Batch export button for all reports */
export function ExportAllButton({ reportType, crossReports, aiReports, groups }: {
  reportType: "cross-submission" | "ai" | "both";
  crossReports?: PlagiarismReport[];
  aiReports?: AIReport[];
  groups: any[];
}) {
  const [open, setOpen] = useState(false);

  const options: { label: string; icon: any; color: string; action: () => void }[] = [];

  if ((reportType === "cross-submission" || reportType === "both") && crossReports && crossReports.length > 0) {
    options.push({
      label: `All Cross-Sub Reports (CSV)`,
      icon: Table2,
      color: DT.success,
      action: () => exportAllCrossSubmissionCSV(crossReports, groups),
    });
  }

  if ((reportType === "ai" || reportType === "both") && aiReports && aiReports.length > 0) {
    options.push({
      label: `All AI Reports (CSV)`,
      icon: Table2,
      color: DT.purple,
      action: () => exportAllAIReportsCSV(aiReports, groups),
    });
  }

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition"
        style={{ background: DT.yellowDim, color: DT.yellow, border: `1px solid rgba(255,209,0,0.15)` }}
      >
        <Download size={12} />
        Export All
        <ChevronDown size={10} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg min-w-[200px]"
            style={{ background: DT.elevated, border: `1px solid ${DT.borderDef}` }}
          >
            {options.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <button
                  key={i}
                  onClick={() => { opt.action(); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-medium hover:opacity-80 transition"
                  style={{ color: DT.textPri, borderBottom: i < options.length - 1 ? `1px solid ${DT.borderHair}` : undefined }}
                >
                  <Icon size={13} style={{ color: opt.color }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* Rate limit indicator */
export function RateLimitIndicator({ remaining, limit, resetInMs, globalRemaining, globalLimit }: {
  remaining: number;
  limit: number;
  resetInMs: number;
  globalRemaining: number;
  globalLimit: number;
}) {
  const minutesLeft = Math.ceil(resetInMs / 60000);
  const pct = (remaining / limit) * 100;
  const color = remaining <= 1 ? DT.red : remaining <= 2 ? DT.warning : DT.success;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: DT.raised, border: `1px solid ${DT.borderHair}` }}>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-bold" style={{ color, fontFamily: FT.m }}>
          {remaining}/{limit}
        </span>
        <span className="text-[10px]" style={{ color: DT.textTer }}>requests left</span>
      </div>
      {remaining < limit && (
        <span className="text-[10px]" style={{ color: DT.textTer }}>
          resets in {minutesLeft}m
        </span>
      )}
      <span className="text-[10px] ml-auto" style={{ color: DT.textDis }}>
        {globalRemaining}/{globalLimit} daily
      </span>
    </div>
  );
}