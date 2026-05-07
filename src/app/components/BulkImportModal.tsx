import { useState, useRef, useEffect, useCallback } from "react";
import type { CSSProperties, ClipboardEvent } from "react";
import {
  X, Upload, CheckCircle, XCircle,
  Loader2, Users, Plus, Trash2, Camera, ClipboardPaste,
  ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";

/* ═══ Types ═══ */
interface StudentRow {
  id: string;
  name: string;
  email: string;
  password: string;
  group: string;
  photo: File | null;
  photoPreview: string;
}

interface RowResult {
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
}

type Step = "edit" | "creating" | "done";

/* ═══ Helpers ═══ */
let _rowId = 0;
function newRow(overrides?: Partial<StudentRow>): StudentRow {
  return {
    id: `r_${++_rowId}_${Date.now()}`,
    name: "", email: "", password: "capstone2026", group: "",
    photo: null, photoPreview: "",
    ...overrides,
  };
}

const cellInput: CSSProperties = {
  background: "transparent", border: "none", color: DT.textPri,
  fontSize: 13, fontFamily: FT.b, outline: "none", width: "100%",
  padding: "8px 0",
};

/* ═══════════════════════════════════════════
   BULK IMPORT MODAL — Spreadsheet Style
   ═══════════════════════════════════════════ */
export function BulkImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>("edit");
  const [rows, setRows] = useState<StudentRow[]>(() => Array.from({ length: 5 }, () => newRow()));
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [showPasteHelper, setShowPasteHelper] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("capstone2026");

  // Groups for dropdown
  const [availableGroups, setAvailableGroups] = useState<{ number: number; title: string }[]>([]);
  const [activeGroupDropdown, setActiveGroupDropdown] = useState<string | null>(null);

  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  // Fetch groups on mount
  useEffect(() => {
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token!;
        const { groups: data } = await apiFetch<{ groups: any[] }>("/groups", {}, token);
        setAvailableGroups((data || []).map((g: any) => ({ number: g.number ?? g.id, title: g.title || "" })));
      } catch { /* silent */ }
    })();
  }, []);

  /* ─── Row operations ─── */
  const updateRow = useCallback((id: string, field: keyof StudentRow, value: any) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const addRows = (count: number) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, () => newRow({ password: defaultPassword }))]);
  };

  const removeRow = (id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length === 0 ? [newRow()] : next;
    });
  };

  const handlePhoto = (id: string, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setRows(prev => prev.map(r => r.id === id ? { ...r, photo: file, photoPreview: preview } : r));
  };

  const removePhoto = (id: string) => {
    setRows(prev => prev.map(r => {
      if (r.id === id && r.photoPreview) URL.revokeObjectURL(r.photoPreview);
      return r.id === id ? { ...r, photo: null, photoPreview: "" } : r;
    }));
  };

  /* ─── Bulk photo upload (matches by name or email) ─── */
  const bulkPhotoRef = useRef<HTMLInputElement>(null);
  const handleBulkPhotos = (files: FileList | null) => {
    if (!files) return;
    setRows(prev => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        const baseName = file.name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "").toLowerCase().trim();
        // Try matching by email
        let idx = next.findIndex(r => r.email.toLowerCase() === baseName);
        // Try matching by name (underscore/dot/no-space variants)
        if (idx === -1) idx = next.findIndex(r =>
          r.name.toLowerCase().replace(/\s+/g, "_") === baseName ||
          r.name.toLowerCase().replace(/\s+/g, ".") === baseName ||
          r.name.toLowerCase().replace(/\s+/g, "") === baseName ||
          r.name.toLowerCase() === baseName
        );
        // Fallback: assign to first row without a photo
        if (idx === -1) idx = next.findIndex(r => !r.photo && r.name.trim());
        if (idx !== -1) {
          if (next[idx].photoPreview) URL.revokeObjectURL(next[idx].photoPreview);
          const preview = URL.createObjectURL(file);
          next[idx] = { ...next[idx], photo: file, photoPreview: preview };
        }
      }
      return next;
    });
    toast.success(`${files.length} photo(s) matched to students`);
  };

  /* ─── Paste from clipboard (Excel/Sheets) ─── */
  const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length <= 1 && !text.includes("\t")) return; // Not tabular data

    e.preventDefault();

    // Detect if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = firstLineLower.includes("name") || firstLineLower.includes("email");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Parse tab or comma separated
    const parsed: Partial<StudentRow>[] = dataLines.map(line => {
      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      const trimmed = cols.map(c => c.trim().replace(/^"|"$/g, ""));
      // Guess column mapping
      // Try: name, email, password, group
      return {
        name: trimmed[0] || "",
        email: trimmed[1] || "",
        password: trimmed[2] || defaultPassword,
        group: trimmed[3] || "",
      };
    }).filter(r => r.name || r.email);

    if (parsed.length === 0) return;

    setRows(prev => {
      // Replace empty rows first, then append
      const emptyCount = prev.filter(r => !r.name && !r.email).length;
      const filledRows = prev.filter(r => r.name || r.email);
      const newRows = parsed.map(p => newRow({ ...p, password: p.password || defaultPassword }));
      return [...filledRows, ...newRows];
    });

    toast.success(`Pasted ${parsed.length} student${parsed.length > 1 ? "s" : ""} from clipboard`);
  }, [defaultPassword]);

  /* ─── Validation ─── */
  const filledRows = rows.filter(r => r.name.trim() || r.email.trim());
  const validRows = filledRows.filter(r => r.name.trim() && r.email.trim() && r.email.includes("@") && r.password.length >= 6);
  const invalidRows = filledRows.filter(r => !r.name.trim() || !r.email.trim() || !r.email.includes("@") || r.password.length < 6);
  const photoCount = rows.filter(r => r.photo).length;

  // Check for duplicate emails
  const emailCounts: Record<string, number> = {};
  filledRows.forEach(r => {
    const e = r.email.toLowerCase();
    emailCounts[e] = (emailCounts[e] || 0) + 1;
  });
  const dupeEmails = new Set(Object.entries(emailCounts).filter(([, c]) => c > 1).map(([e]) => e));

  /* ─── Create accounts + upload photos ─── */
  const handleCreate = async () => {
    if (validRows.length === 0) { toast.error("No valid rows to create."); return; }
    setStep("creating");
    setProgress(0);
    setResults([]);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;

      // 1) Create accounts in batches
      const batchSize = 10;
      const allResults: RowResult[] = [];
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize).map(r => ({
          name: r.name.trim(), email: r.email.trim(),
          password: r.password, role: "student", group: r.group || "",
        }));
        try {
          const res = await apiFetch<{ results: RowResult[] }>("/auth/bulk-signup", {
            method: "POST", body: JSON.stringify({ users: batch }),
          }, token);
          allResults.push(...(res.results || []));
        } catch (err: any) {
          batch.forEach(u => allResults.push({ email: u.email, success: false, error: err.message }));
        }
        setProgress(Math.round(((i + batchSize) / validRows.length) * 50)); // 0-50% for accounts
        setResults([...allResults]);
      }

      // 2) Upload photos for successful accounts
      const photosToUpload = validRows.filter(r => r.photo && allResults.find(
        res => res.email.toLowerCase() === r.email.toLowerCase() && res.success
      ));

      if (photosToUpload.length > 0) {
        setProgress(55);
        const formData = new FormData();
        for (const r of photosToUpload) {
          formData.append(`avatar_${r.email.toLowerCase()}`, r.photo!);
        }
        try {
          await apiFetch("/users/bulk-avatar", { method: "POST", body: formData }, token);
        } catch (err: any) {
          console.error("Photo upload failed:", err);
          toast.error(`Photos upload failed: ${err.message}`);
        }
        setProgress(95);
      }

      setProgress(100);
      setResults(allResults);

      const successN = allResults.filter(r => r.success).length;
      const failN = allResults.filter(r => !r.success).length;
      if (failN === 0) toast.success(`All ${successN} accounts created!`);
      else toast.warning(`${successN} created, ${failN} failed.`);

      setStep("done");
    } catch (err: any) {
      toast.error(`Bulk import failed: ${err.message}`);
      setStep("done");
    }
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ fontFamily: FT.b }}>
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="relative w-full max-w-[960px] max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)` }}>
              <Users size={20} style={{ color: DT.blue }} />
            </div>
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>Bulk Add Students</h2>
              <p style={{ fontSize: 12, color: DT.textTer }}>
                {step === "edit" ? "Fill in student details below — paste from Excel or type manually" :
                 step === "creating" ? "Creating accounts & uploading photos..." :
                 "Import complete!"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="transition cursor-pointer p-1.5 rounded-lg hover:bg-white/[0.05]" style={{ color: DT.textTer }}><X size={20} /></button>
        </div>

        {/* ── STEP: Edit (Spreadsheet) ── */}
        {step === "edit" && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 flex-wrap shrink-0" style={{ borderBottom: `1px solid ${DT.borderHair}`, background: "rgba(255,255,255,0.01)" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => addRows(1)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
                  <Plus size={14} /> Add Row
                </button>
                <button onClick={() => addRows(5)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
                  <Plus size={14} /> +5 Rows
                </button>
                <div className="w-px h-6" style={{ background: DT.borderHair }} />
                <button onClick={() => bulkPhotoRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${withAlpha(DT.blue, 0.15)}`, background: DT.blueDim, color: DT.blue, fontSize: 12, fontWeight: 600 }}>
                  <ImageIcon size={14} /> Bulk Upload Photos
                </button>
                <input ref={bulkPhotoRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleBulkPhotos(e.target.files)} />
                <button onClick={() => setShowPasteHelper(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 12, fontWeight: 600 }}>
                  <ClipboardPaste size={14} /> Paste Guide
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label style={{ fontSize: 11, color: DT.textTer, whiteSpace: "nowrap" }}>Default PW:</label>
                <input value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)}
                  className="px-2 py-1.5 rounded-lg" style={{
                    background: DT.raised, border: `1px solid ${DT.borderDef}`, color: DT.textPri,
                    fontSize: 12, fontFamily: FT.m, outline: "none", width: 120,
                  }} />
              </div>
            </div>

            {/* Paste helper banner */}
            {showPasteHelper && (
              <div className="px-6 py-3 shrink-0" style={{ background: DT.blueDim, borderBottom: `1px solid rgba(77,143,255,0.10)` }}>
                <div className="flex items-start gap-2">
                  <ClipboardPaste size={14} className="mt-0.5 shrink-0" style={{ color: DT.blue }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>Paste from Excel / Google Sheets</p>
                    <p style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>
                      Copy rows from your spreadsheet (columns: Name, Email, Password, Group) and press <kbd className="px-1.5 py-0.5 rounded" style={{ background: DT.raised, border: `1px solid ${DT.borderDef}`, fontSize: 10, fontWeight: 700 }}>Ctrl+V</kbd> anywhere in the table.
                      Tab-separated and comma-separated formats are both supported. Headers are auto-detected and skipped.
                    </p>
                    <p style={{ fontSize: 11, color: DT.textTer, marginTop: 4 }}>
                      For bulk photos, name files by student email (e.g. <code style={{ fontSize: 10, background: DT.raised, padding: "1px 4px", borderRadius: 3 }}>juan@sti.edu.ph.jpg</code>) or
                      name with underscores (<code style={{ fontSize: 10, background: DT.raised, padding: "1px 4px", borderRadius: 3 }}>juan_dela_cruz.jpg</code>).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Spreadsheet table */}
            <div ref={tableRef} className="flex-1 overflow-auto min-h-0" onPaste={handlePaste} tabIndex={0}>
              <table className="w-full" style={{ fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.025)" }}>
                    <th className="text-center px-2 py-2.5 sticky top-0" style={{ width: 48, ...thStyle }}>#</th>
                    <th className="text-center px-2 py-2.5 sticky top-0" style={{ width: 52, ...thStyle }}>Photo</th>
                    <th className="text-left px-3 py-2.5 sticky top-0" style={{ minWidth: 160, ...thStyle }}>Full Name *</th>
                    <th className="text-left px-3 py-2.5 sticky top-0" style={{ minWidth: 200, ...thStyle }}>Email *</th>
                    <th className="text-left px-3 py-2.5 sticky top-0" style={{ minWidth: 120, ...thStyle }}>Password</th>
                    <th className="text-left px-3 py-2.5 sticky top-0" style={{ minWidth: 130, ...thStyle }}>Group</th>
                    <th className="text-center px-2 py-2.5 sticky top-0" style={{ width: 44, ...thStyle }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isFilled = row.name.trim() || row.email.trim();
                    const hasError = isFilled && (!row.name.trim() || !row.email.trim() || !row.email.includes("@") || row.password.length < 6);
                    const isDupe = isFilled && dupeEmails.has(row.email.toLowerCase());
                    return (
                      <tr key={row.id}
                        className="transition group"
                        style={{
                          borderBottom: `1px solid ${DT.borderHair}`,
                          background: hasError ? withAlpha(DT.red, 0.02) : isDupe ? withAlpha(DT.warning, 0.02) : "transparent",
                        }}>
                        {/* Row number */}
                        <td className="text-center px-2 py-1" style={{ fontSize: 11, color: DT.textDis, fontFamily: FT.m }}>{idx + 1}</td>

                        {/* Photo cell */}
                        <td className="text-center px-2 py-1">
                          <div className="relative mx-auto" style={{ width: 34, height: 34 }}>
                            {row.photoPreview ? (
                              <div className="w-full h-full rounded-full overflow-hidden cursor-pointer relative group/photo"
                                onClick={() => photoRefs.current[row.id]?.click()}>
                                <img src={row.photoPreview} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center rounded-full">
                                  <Camera size={12} className="text-white" />
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removePhoto(row.id); }}
                                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition cursor-pointer"
                                  style={{ background: DT.red, color: "white" }}>
                                  <X size={8} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => photoRefs.current[row.id]?.click()}
                                className="w-full h-full rounded-full flex items-center justify-center transition cursor-pointer hover:border-blue-400/40"
                                style={{ border: `2px dashed ${DT.borderDef}`, background: "rgba(255,255,255,0.02)" }}>
                                <Camera size={13} style={{ color: DT.textDis }} />
                              </button>
                            )}
                            <input
                              ref={el => { photoRefs.current[row.id] = el; }}
                              type="file" accept="image/*" className="hidden"
                              onChange={(e) => handlePhoto(row.id, e.target.files?.[0] || null)}
                            />
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-1 py-1">
                          <input
                            value={row.name}
                            onChange={e => updateRow(row.id, "name", e.target.value)}
                            placeholder="Juan dela Cruz"
                            style={{ ...cellInput, color: row.name ? DT.textPri : undefined }}
                          />
                        </td>

                        {/* Email */}
                        <td className="px-1 py-1">
                          <input
                            value={row.email}
                            onChange={e => updateRow(row.id, "email", e.target.value)}
                            placeholder="juan@sti.edu.ph"
                            style={{
                              ...cellInput,
                              fontFamily: FT.m, fontSize: 12,
                              color: isDupe ? DT.warning : row.email ? DT.textPri : undefined,
                            }}
                          />
                        </td>

                        {/* Password */}
                        <td className="px-1 py-1">
                          <input
                            value={row.password}
                            onChange={e => updateRow(row.id, "password", e.target.value)}
                            placeholder={defaultPassword}
                            style={{ ...cellInput, fontFamily: FT.m, fontSize: 12 }}
                          />
                        </td>

                        {/* Group dropdown */}
                        <td className="px-1 py-1">
                          <div className="relative">
                            <button
                              onClick={() => setActiveGroupDropdown(activeGroupDropdown === row.id ? null : row.id)}
                              className="flex items-center justify-between gap-1 w-full py-2 px-1 text-left transition rounded hover:bg-white/[0.03] cursor-pointer"
                              style={{ fontSize: 12, color: row.group ? DT.textPri : DT.textDis }}>
                              <span className="truncate">{row.group || "Select..."}</span>
                              <ChevronDown size={12} className="shrink-0" style={{ color: DT.textDis }} />
                            </button>
                            {activeGroupDropdown === row.id && availableGroups.length > 0 && (
                              <div className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden z-20 shadow-lg"
                                style={{ background: DT.elevated, border: `1px solid ${DT.borderSub}` }}>
                                <button
                                  onClick={() => { updateRow(row.id, "group", ""); setActiveGroupDropdown(null); }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition cursor-pointer"
                                  style={{ fontSize: 12, color: DT.textTer }}>
                                  None
                                </button>
                                {availableGroups.map(g => (
                                  <button key={g.number}
                                    onClick={() => { updateRow(row.id, "group", `Group ${g.number}`); setActiveGroupDropdown(null); }}
                                    className="w-full text-left px-3 py-2 hover:bg-white/[0.04] transition cursor-pointer"
                                    style={{ fontSize: 12, color: DT.textPri, borderTop: `1px solid ${DT.borderHair}` }}>
                                    <span style={{ fontWeight: 600 }}>Group {g.number}</span>
                                    {g.title && <span style={{ color: DT.textTer }}> — {g.title}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Delete */}
                        <td className="text-center px-2 py-1">
                          <button onClick={() => removeRow(row.id)}
                            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer hover:bg-white/[0.05]"
                            style={{ color: DT.textDis }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Quick add row button at bottom */}
              <button onClick={() => addRows(1)}
                className="w-full py-3 flex items-center justify-center gap-2 transition cursor-pointer hover:bg-white/[0.03]"
                style={{ borderTop: `1px solid ${DT.borderHair}`, color: DT.textDis, fontSize: 12 }}>
                <Plus size={14} /> Add another row
              </button>
            </div>

            {/* Footer with stats + create button */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 flex-wrap shrink-0" style={{ borderTop: `1px solid ${DT.borderHair}`, background: "rgba(255,255,255,0.01)" }}>
              <div className="flex items-center gap-4 flex-wrap">
                <StatPill label="Students" value={filledRows.length} color={DT.blue} />
                <StatPill label="Valid" value={validRows.length} color={DT.success} />
                {invalidRows.length > 0 && <StatPill label="Invalid" value={invalidRows.length} color={DT.red} />}
                {dupeEmails.size > 0 && <StatPill label="Dupes" value={dupeEmails.size} color={DT.warning} />}
                {photoCount > 0 && <StatPill label="Photos" value={photoCount} color={DT.purple} />}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={onClose}
                  className="px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                  Cancel
                </button>
                <button onClick={handleCreate} disabled={validRows.length === 0 || dupeEmails.size > 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
                  <Upload size={16} />
                  Create {validRows.length} Account{validRows.length !== 1 ? "s" : ""}
                  {photoCount > 0 && <span style={{ opacity: 0.7 }}>+ {photoCount} photos</span>}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: Creating ── */}
        {step === "creating" && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-6 px-6">
            <Loader2 size={44} className="animate-spin" style={{ color: DT.blue }} />
            <div className="text-center">
              <p style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
                {progress < 50 ? "Creating Accounts..." : progress < 95 ? "Uploading Photos..." : "Finishing up..."}
              </p>
              <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>
                {results.length} of {validRows.length} accounts processed
              </p>
            </div>
            <div className="w-full max-w-[420px]">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${DT.blue}, ${DT.purple})`,
                }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span style={{ fontSize: 12, color: DT.textTer, fontFamily: FT.m }}>{progress}%</span>
                <div className="flex items-center gap-3">
                  {results.filter(r => r.success).length > 0 && (
                    <span className="flex items-center gap-1" style={{ fontSize: 12, color: DT.success }}>
                      <CheckCircle size={12} /> {results.filter(r => r.success).length}
                    </span>
                  )}
                  {results.filter(r => !r.success).length > 0 && (
                    <span className="flex items-center gap-1" style={{ fontSize: 12, color: DT.red }}>
                      <XCircle size={12} /> {results.filter(r => !r.success).length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Done ── */}
        {step === "done" && (
          <div className="flex-1 overflow-auto px-6 py-10">
            <div className="flex flex-col items-center gap-6 max-w-[520px] mx-auto">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                background: successCount > 0 ? DT.successDim : DT.redDim,
                border: `2px solid ${successCount > 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              }}>
                {successCount > 0 ? <CheckCircle size={32} style={{ color: DT.success }} /> : <XCircle size={32} style={{ color: DT.red }} />}
              </div>
              <div className="text-center">
                <h3 style={{ fontFamily: FT.h, fontSize: 24, fontWeight: 700, color: DT.textPri }}>
                  {successCount > 0 ? "Import Complete!" : "Import Failed"}
                </h3>
                <p className="mt-2" style={{ fontSize: 14, color: DT.textTer }}>
                  {successCount > 0 && <>{successCount} student account{successCount !== 1 ? "s" : ""} created successfully.</>}
                  {photoCount > 0 && successCount > 0 && <><br />{photoCount} profile photo{photoCount !== 1 ? "s" : ""} uploaded.</>}
                </p>
              </div>

              {/* Results table */}
              {results.length > 0 && (
                <div className="w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderSub}` }}>
                  <div className="max-h-[250px] overflow-y-auto">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                        {r.success
                          ? <CheckCircle size={14} style={{ color: DT.success }} />
                          : <XCircle size={14} style={{ color: DT.red }} />
                        }
                        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12, color: DT.textPri }}>{r.email}</span>
                        {r.success
                          ? <span style={{ fontSize: 11, color: DT.success, fontWeight: 600 }}>Created</span>
                          : <span className="truncate max-w-[180px]" style={{ fontSize: 11, color: DT.red }}>{r.error}</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { onDone(); onClose(); }}
                className="px-10 py-3 rounded-xl transition cursor-pointer hover:opacity-90"
                style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 15, fontWeight: 700 }}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close group dropdown on outside click */}
      {activeGroupDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveGroupDropdown(null)} />
      )}
    </div>
  );
}

/* ─── Stat pill for footer ─── */
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: withAlpha(color, 0.06), border: `1px solid ${withAlpha(color, 0.09)}` }}>
      <span style={{ fontFamily: FT.h, fontSize: 13, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 11, color: DT.textTer }}>{label}</span>
    </span>
  );
}

/* ─── Shared th style ─── */
const thStyle: CSSProperties = {
  fontWeight: 600, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase",
  color: DT.textTer, background: DT.raised, borderBottom: `1px solid ${DT.borderHair}`,
  zIndex: 5,
};