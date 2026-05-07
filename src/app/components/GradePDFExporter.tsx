import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { toast } from "sonner";

/* ═══════════════════════════════════════════
   Grade PDF Exporter
   Generates a formatted PDF of final defense grades
   for coordinators and lead panelists.
   ═══════════════════════════════════════════ */

interface GradeRecord {
  groupNumber: number | string;
  groupTitle: string;
  members: string[];
  groupScore: number;   // out of 12
  groupPct: number;     // percentage
  individualAvg: number; // average individual score
  overallGrade: number;  // weighted final
  verdict: string;       // "pass" | "minor" | "major" | "failed"
  panelists: string[];
  feedback?: string;
}

interface GradePDFExporterProps {
  grades: GradeRecord[];
  title?: string;
  className?: string;
}

const VERDICT_LABELS: Record<string, string> = {
  pass: "PASS",
  minor: "Minor Revisions",
  major: "Major Revisions",
  failed: "Failed / Re-Defense",
};

export function GradePDFExporter({
  grades,
  title = "BMMA Capstone Defense Grade Report",
  className = "",
}: GradePDFExporterProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // ── Header ──
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("STI College San Fernando", 14, 18);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(title, 14, 25);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, 14, 31);
      doc.text(`AY 2025–2026  |  Total Groups: ${grades.length}`, 14, 36);
      doc.setTextColor(0);

      // ── Summary stats ──
      const passed = grades.filter(g => g.verdict === "pass").length;
      const minor = grades.filter(g => g.verdict === "minor").length;
      const major = grades.filter(g => g.verdict === "major").length;
      const failed = grades.filter(g => g.verdict === "failed").length;
      const avgOverall = grades.length > 0
        ? (grades.reduce((s, g) => s + g.overallGrade, 0) / grades.length).toFixed(1)
        : "—";

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Summary:  Pass: ${passed}  |  Minor Rev: ${minor}  |  Major Rev: ${major}  |  Failed: ${failed}  |  Avg Grade: ${avgOverall}%`, 14, 42);
      doc.setFont("helvetica", "normal");

      // ── Grades table ──
      const tableData = grades.map(g => [
        String(g.groupNumber),
        g.groupTitle.length > 40 ? g.groupTitle.slice(0, 40) + "…" : g.groupTitle,
        g.members.slice(0, 4).join(", ") + (g.members.length > 4 ? ` +${g.members.length - 4}` : ""),
        `${g.groupScore}/12 (${g.groupPct.toFixed(0)}%)`,
        `${g.individualAvg.toFixed(1)}/12`,
        `${g.overallGrade.toFixed(1)}%`,
        VERDICT_LABELS[g.verdict] || g.verdict,
        g.panelists.slice(0, 3).join(", "),
      ]);

      autoTable(doc, {
        startY: 46,
        head: [["#", "Project Title", "Members", "Group (60%)", "Indiv Avg (40%)", "Overall", "Verdict", "Panelists"]],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
        },
        headStyles: {
          fillColor: [30, 40, 60],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          3: { halign: "center", cellWidth: 28 },
          4: { halign: "center", cellWidth: 26 },
          5: { halign: "center", cellWidth: 20, fontStyle: "bold" },
          6: { halign: "center", cellWidth: 30 },
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        didParseCell: (data: any) => {
          // Color-code verdict column
          if (data.column.index === 6 && data.section === "body") {
            const verdict = grades[data.row.index]?.verdict;
            if (verdict === "pass") data.cell.styles.textColor = [22, 163, 74];
            else if (verdict === "minor") data.cell.styles.textColor = [59, 130, 246];
            else if (verdict === "major") data.cell.styles.textColor = [217, 119, 6];
            else if (verdict === "failed") data.cell.styles.textColor = [220, 38, 38];
          }
          // Bold the overall grade
          if (data.column.index === 5 && data.section === "body") {
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      // ── Footer ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount}  |  CapstonePH — STI College San Fernando  |  CONFIDENTIAL`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 6,
          { align: "center" }
        );
      }

      // ── Save ──
      const filename = `CapstonePH_Defense_Grades_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      toast.success(`PDF exported: ${filename}`);
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || grades.length === 0}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: withAlpha(DT.purple, 0.08),
        border: `1px solid ${withAlpha(DT.purple, 0.2)}`,
        color: DT.purple,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: FT.h,
      }}
    >
      {exporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileDown size={16} />
      )}
      {exporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}
