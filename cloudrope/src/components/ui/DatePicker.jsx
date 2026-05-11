import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * DatePicker — drop-in replacement for <input type="date" />
 *
 * Props:
 *   value       string  "YYYY-MM-DD"  (controlled)
 *   onChange    fn(dateString: "YYYY-MM-DD") => void
 *   placeholder string
 *   error       boolean  — adds error ring when true
 *   disabled    boolean
 *   minYear     number   default 1900
 *   maxYear     number   default current year
 *
 * Integrates with react-hook-form via Controller:
 *
 *   <Controller
 *     control={control}
 *     name="date_of_birth"
 *     rules={{ required: 'Date of birth is required', validate: ... }}
 *     render={({ field }) => (
 *       <DatePicker
 *         value={field.value}
 *         onChange={field.onChange}
 *         error={!!errors.date_of_birth}
 *       />
 *     )}
 *   />
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = 'DD / MM / YYYY',
  error = false,
  disabled = false,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
}) {
  const today = new Date();

  // Parse controlled value
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear() - 20);
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const [mode, setMode] = useState('days'); // 'days' | 'months' | 'years'

  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setMode('days');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  /* ── Helpers ───────────────────────────── */
  const selectDate = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange?.(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
    setMode('days');
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isSelected = (day) =>
    parsed &&
    parsed.getFullYear() === viewYear &&
    parsed.getMonth() === viewMonth &&
    parsed.getDate() === day;

  const isToday = (day) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  /* ── Display value ─────────────────────── */
  const displayValue = parsed
    ? `${String(parsed.getDate()).padStart(2, '0')} / ${String(parsed.getMonth() + 1).padStart(2, '0')} / ${parsed.getFullYear()}`
    : '';

  /* ── Calendar grid ─────────────────────── */
  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  /* ── Years list ────────────────────────── */
  const years = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'input-field w-full flex items-center justify-between text-left transition-all',
          !displayValue ? 'text-text-muted/50' : 'text-text-primary',
          error ? 'border-error ring-1 ring-error/30' : '',
          open ? 'border-accent ring-2 ring-accent/20' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className="text-sm">{displayValue || placeholder}</span>
        <Calendar
          size={14}
          className={['transition-colors', open ? 'text-accent' : 'text-text-muted'].join(' ')}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className={[
            'absolute z-50 mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl shadow-black/40',
            'overflow-hidden',
            // Animate in
            'animate-slide-up',
          ].join(' ')}
          style={{ minWidth: '272px' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/50">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-1">
              {/* Month selector */}
              <button
                type="button"
                onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-text-primary hover:bg-white/5 transition-colors"
              >
                {MONTHS[viewMonth]}
                <ChevronDown size={11} className={['transition-transform', mode === 'months' ? 'rotate-180' : ''].join(' ')} />
              </button>

              {/* Year selector */}
              <button
                type="button"
                onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold text-text-primary hover:bg-white/5 transition-colors"
              >
                {viewYear}
                <ChevronDown size={11} className={['transition-transform', mode === 'years' ? 'rotate-180' : ''].join(' ')} />
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* ── Month picker ── */}
          {mode === 'months' && (
            <div className="grid grid-cols-3 gap-1 p-3">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(i); setMode('days'); }}
                  className={[
                    'py-2 rounded-lg text-xs font-medium transition-all',
                    i === viewMonth
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:bg-white/5 hover:text-text-primary',
                  ].join(' ')}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* ── Year picker ── */}
          {mode === 'years' && (
            <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-4 gap-1 custom-scrollbar">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setMode('days'); }}
                  className={[
                    'py-1.5 rounded-lg text-xs font-medium transition-all',
                    y === viewYear
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:bg-white/5 hover:text-text-primary',
                  ].join(' ')}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* ── Calendar days ── */}
          {mode === 'days' && (
            <div className="p-3">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-text-muted/60 py-1 tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  const sel = isSelected(day);
                  const tod = isToday(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={[
                        'relative w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all',
                        sel
                          ? 'bg-accent text-white shadow-sm shadow-accent/30'
                          : tod
                          ? 'text-accent ring-1 ring-accent/40 hover:bg-accent/10'
                          : 'text-text-muted hover:bg-white/5 hover:text-text-primary',
                      ].join(' ')}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          {mode === 'days' && (
            <div className="flex justify-between items-center px-3 pb-3 pt-1 border-t border-border/30">
              <button
                type="button"
                onClick={() => onChange?.('')}
                className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewYear(today.getFullYear());
                  setViewMonth(today.getMonth());
                  selectDate(today.getDate());
                }}
                className="text-[11px] text-accent hover:underline transition-colors"
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}