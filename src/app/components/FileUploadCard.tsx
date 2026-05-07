import { Upload, FileText, CheckCircle, Clock, AlertCircle, Eye, Download, Trash2 } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ─── File type icon configs ─── */
const FILE_TYPES: Record<string, { bg: string; color: string }> = {
  PDF: { bg: "bg-[#FEF2F2]", color: "text-[#DC2626]" },
  DOC: { bg: "bg-[#EFF6FF]", color: "text-[#2563EB]" },
  DOCX: { bg: "bg-[#EFF6FF]", color: "text-[#2563EB]" },
  ZIP: { bg: "bg-[#FFF7ED]", color: "text-[#EA580C]" },
  MP4: { bg: "bg-[#F5F3FF]", color: "text-[#7C3AED]" },
  IMG: { bg: "bg-[#F0FDF4]", color: "text-[#16A34A]" },
  GDOC: { bg: "bg-white", color: "text-[#4285F4]" },
};

interface FileUploadCardProps {
  status?: "empty" | "pending" | "uploaded" | "approved" | "rejected";
  fileName?: string;
  fileSize?: string;
  fileDate?: string;
  fileType?: string;
  onUpload?: () => void;
}

const statusConfig = {
  empty: { label: "Upload File", color: "#64748B", icon: <Upload size={20} className="text-[#CBD5E1]" /> },
  pending: { label: "Pending Review", color: "#D97706", icon: <Clock size={20} className="text-[#D97706]" /> },
  uploaded: { label: "Uploaded", color: "#003087", icon: <FileText size={20} className="text-[#003087]" /> },
  approved: { label: "Approved", color: "#16A34A", icon: <CheckCircle size={20} className="text-[#16A34A]" /> },
  rejected: { label: "Rejected", color: "#DC2626", icon: <AlertCircle size={20} className="text-[#DC2626]" /> },
};

export function FileUploadCard({ status = "empty", fileName, fileSize, fileDate, fileType = "PDF", onUpload }: FileUploadCardProps) {
  const config = statusConfig[status];
  const ft = FILE_TYPES[fileType.toUpperCase()] || FILE_TYPES.PDF;

  /* ─── Dashed upload state ─── */
  if (status === "empty" || !fileName) {
    return (
      <button
        onClick={onUpload}
        className="w-full rounded-[16px] border-2 border-dashed border-[#CBD5E1] flex flex-col items-center gap-2 py-10 transition hover:border-[#003087] hover:bg-[#EEF2FF] cursor-pointer group"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Upload size={24} className="text-[#94A3B8] group-hover:text-[#003087] transition" />
        <span className="text-[#94A3B8] group-hover:text-[#003087] transition" style={{ fontSize: "13px" }}>
          Drag & drop or click to upload
        </span>
      </button>
    );
  }

  /* ─── File card with info ─── */
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-white rounded-[16px] border border-[#E2E8F0] group"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* File type icon */}
      <div className={`w-10 h-10 rounded-[10px] ${ft.bg} flex items-center justify-center shrink-0`}>
        <FileText size={20} className={ft.color} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="text-[#0F172A] truncate" style={{ fontFamily: "var(--font-heading)", fontSize: "13px", fontWeight: 700 }}>{fileName}</div>
        <div className="text-[#94A3B8]" style={{ fontSize: "11px" }}>
          {fileSize}{fileSize && fileDate && " · "}{fileDate}
        </div>
      </div>

      {/* Status badge */}
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
        style={{ fontSize: "11px", fontWeight: 500, color: config.color, backgroundColor: withAlpha(config.color, 0.08) }}
      >
        {config.icon}
        {config.label}
      </span>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
        <button className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#64748B] transition cursor-pointer">
          <Eye size={16} />
        </button>
        <button className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#64748B] transition cursor-pointer">
          <Download size={16} />
        </button>
        <button className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition cursor-pointer">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}