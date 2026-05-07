import { DT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   Page-Specific Skeleton Screens
   Cinematic Dark Premium themed
   ═══════════════════════════════════════════ */

const shimmerKF = `@keyframes skShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`;

const shimmerBg = `linear-gradient(90deg, transparent 0%, ${withAlpha(DT.textPri, 0.04)} 40%, ${withAlpha(DT.textPri, 0.07)} 50%, ${withAlpha(DT.textPri, 0.04)} 60%, transparent 100%)`;
const shimmerStyle: React.CSSProperties = {
  backgroundImage: shimmerBg,
  backgroundSize: "200% 100%",
  animation: "skShimmer 1.8s ease-in-out infinite",
};

function Bone({ w, h = 14, rounded = 8, className = "" }: { w: number | string; h?: number; rounded?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: typeof w === "number" ? w : w,
        height: h,
        borderRadius: rounded,
        background: withAlpha(DT.textPri, 0.06),
        ...shimmerStyle,
      }}
    />
  );
}

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Dashboard Skeleton (stat cards + content) ── */
export function DashboardSkeleton() {
  return (
    <div>
      <style>{shimmerKF}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Bone w={200} h={24} className="mb-2" />
          <Bone w={300} h={12} />
        </div>
        <Bone w={120} h={36} rounded={12} />
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-center gap-3">
              <Bone w={36} h={36} rounded={12} />
              <div>
                <Bone w={32} h={20} className="mb-1" />
                <Bone w={56} h={10} />
              </div>
            </div>
          </CardShell>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardShell key={i}>
            <Bone w={140} h={16} className="mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Bone w={32} h={32} rounded={999} />
                  <div className="flex-1">
                    <Bone w="80%" h={12} className="mb-1.5" />
                    <Bone w="50%" h={10} />
                  </div>
                </div>
              ))}
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/* ── Manuscript List Skeleton ── */
export function ManuscriptListSkeleton() {
  return (
    <div>
      <style>{shimmerKF}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Bone w={220} h={24} />
        <div className="flex gap-2">
          <Bone w={160} h={36} rounded={12} />
          <Bone w={100} h={36} rounded={12} />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} w={80} h={32} rounded={20} />
        ))}
      </div>

      {/* Manuscript cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardShell key={i} className="flex items-center gap-4">
            <Bone w={48} h={48} rounded={12} />
            <div className="flex-1">
              <Bone w="60%" h={14} className="mb-2" />
              <Bone w="40%" h={10} className="mb-1.5" />
              <div className="flex gap-2">
                <Bone w={60} h={18} rounded={9} />
                <Bone w={80} h={18} rounded={9} />
              </div>
            </div>
            <Bone w={24} h={24} rounded={6} />
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/* ── Defense Schedule Skeleton ── */
export function DefenseScheduleSkeleton() {
  return (
    <div>
      <style>{shimmerKF}</style>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Bone w={240} h={24} />
        <Bone w={130} h={36} rounded={12} />
      </div>

      {/* Calendar mini */}
      <CardShell className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Bone w={120} h={16} />
          <div className="flex gap-2">
            <Bone w={28} h={28} rounded={8} />
            <Bone w={28} h={28} rounded={8} />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Bone key={i} w="100%" h={32} rounded={8} />
          ))}
        </div>
      </CardShell>

      {/* Schedule items */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Bone w={48} h={16} className="mb-1" />
                <Bone w={48} h={24} />
              </div>
              <div className="w-px h-12" style={{ background: DT.borderSub }} />
              <div className="flex-1">
                <Bone w="50%" h={14} className="mb-2" />
                <Bone w="70%" h={10} className="mb-1.5" />
                <div className="flex gap-1.5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Bone key={j} w={28} h={28} rounded={999} />
                  ))}
                </div>
              </div>
              <Bone w={70} h={24} rounded={12} />
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/* ── Grading Page Skeleton ── */
export function GradingSkeleton() {
  return (
    <div>
      <style>{shimmerKF}</style>
      <div className="flex items-center justify-between mb-6">
        <Bone w={180} h={24} />
        <Bone w={120} h={36} rounded={12} />
      </div>
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardShell key={i}>
            <Bone w={50} h={28} className="mb-1" />
            <Bone w={80} h={10} />
          </CardShell>
        ))}
      </div>
      {/* Groups list */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardShell key={i}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bone w={40} h={40} rounded={12} />
                <div>
                  <Bone w={160} h={14} className="mb-1.5" />
                  <Bone w={100} h={10} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bone w={48} h={20} rounded={10} />
                <Bone w={60} h={20} rounded={10} />
              </div>
            </div>
          </CardShell>
        ))}
      </div>
    </div>
  );
}

/* ── User Management Skeleton ── */
export function UserListSkeleton() {
  return (
    <div>
      <style>{shimmerKF}</style>
      <div className="flex items-center justify-between mb-6">
        <Bone w={200} h={24} />
        <div className="flex gap-2">
          <Bone w={200} h={36} rounded={12} />
          <Bone w={100} h={36} rounded={12} />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} w={70} h={30} rounded={16} />
        ))}
      </div>
      <CardShell>
        {/* Table header */}
        <div className="flex gap-4 mb-3 px-2">
          {["20%", "25%", "12%", "15%", "10%"].map((w, i) => (
            <Bone key={i} w={w} h={10} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 px-2" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            <Bone w={32} h={32} rounded={999} />
            <Bone w="20%" h={12} />
            <Bone w="25%" h={12} />
            <Bone w={60} h={18} rounded={9} />
            <Bone w={50} h={18} rounded={9} />
            <div className="flex gap-1.5 ml-auto">
              <Bone w={28} h={28} rounded={8} />
              <Bone w={28} h={28} rounded={8} />
            </div>
          </div>
        ))}
      </CardShell>
    </div>
  );
}
