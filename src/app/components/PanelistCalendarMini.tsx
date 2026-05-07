import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ═══════════════════════════════════════════
   Panelist Calendar Mini-View
   Small calendar widget showing defense dates
   ═══════════════════════════════════════════ */

interface DefenseEvent {
  id: string;
  date: string; // ISO date e.g. "2026-03-20"
  time?: string;
  group: string;
  room?: string;
}

interface PanelistCalendarMiniProps {
  events: DefenseEvent[];
  onEventClick?: (event: DefenseEvent) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export function PanelistCalendarMini({ events, onEventClick }: PanelistCalendarMiniProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(viewYear, viewMonth, d));
    // Pad to 42 cells (6 rows)
    while (days.length < 42) days.push(null);
    return days;
  }, [viewMonth, viewYear]);

  // Event dates set for quick lookup
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => set.add(e.date));
    return set;
  }, [events]);

  // Events for selected date
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toISOString().split("T")[0];
    return events.filter(e => e.date === key);
  }, [selectedDate, events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
        boxShadow: DT.shadowSm,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.textPri }}>
          Defense Schedule
        </span>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, minWidth: 120, textAlign: "center", fontFamily: FT.h }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/[0.05]" style={{ color: DT.textTer }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center py-1">
            <span style={{ fontSize: 9, fontWeight: 600, color: DT.textTer, letterSpacing: "0.05em" }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-[2px]">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-8" />;

          const isToday = isSameDay(day, today);
          const dateKey = day.toISOString().split("T")[0];
          const hasEvent = eventDates.has(dateKey);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(day)}
              className="h-8 rounded-lg flex flex-col items-center justify-center relative cursor-pointer"
              style={{
                background: isSelected ? withAlpha(DT.purple, 0.15) : isToday ? withAlpha(DT.blue, 0.08) : "transparent",
                border: isSelected ? `1px solid ${withAlpha(DT.purple, 0.3)}` : isToday ? `1px solid ${withAlpha(DT.blue, 0.2)}` : "1px solid transparent",
                transition: "background 150ms, border-color 150ms",
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: isToday || hasEvent ? 700 : 400,
                color: isSelected ? DT.purple : isToday ? DT.blue : hasEvent ? DT.textPri : DT.textSec,
                fontFamily: FT.m,
              }}>
                {day.getDate()}
              </span>
              {hasEvent && (
                <div className="w-1 h-1 rounded-full absolute bottom-1" style={{ background: DT.purple, boxShadow: `0 0 4px ${withAlpha(DT.purple, 0.5)}` }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: DT.textTer, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <div className="mt-2 space-y-2">
            {selectedEvents.map(ev => (
              <button
                key={ev.id}
                onClick={() => onEventClick?.(ev)}
                className="w-full text-left rounded-xl p-3 cursor-pointer"
                style={{
                  background: withAlpha(DT.purple, 0.06),
                  border: `1px solid ${withAlpha(DT.purple, 0.12)}`,
                  transition: "background 200ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = withAlpha(DT.purple, 0.10); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = withAlpha(DT.purple, 0.06); }}
              >
                <span style={{ fontFamily: FT.h, fontSize: 12, fontWeight: 700, color: DT.textPri }}>
                  {ev.group}
                </span>
                <div className="flex items-center gap-3 mt-1">
                  {ev.time && (
                    <span className="flex items-center gap-1" style={{ fontSize: 10, color: DT.textTer }}>
                      <Clock size={10} /> {ev.time}
                    </span>
                  )}
                  {ev.room && (
                    <span className="flex items-center gap-1" style={{ fontSize: 10, color: DT.textTer }}>
                      <MapPin size={10} /> {ev.room}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedEvents.length === 0 && (
        <div className="mt-3 pt-3 text-center" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <span style={{ fontSize: 11, color: DT.textTer }}>No defense sessions on this date</span>
        </div>
      )}
    </div>
  );
}
