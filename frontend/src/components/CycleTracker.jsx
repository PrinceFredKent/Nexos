import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { createPortal } from 'react-dom';

// ─── Utility Helpers ────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a, b) {
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}

function toISODate(date) {
  return date.toISOString().split('T')[0];
}

function computeCycleInfo(logs) {
  if (!logs || logs.length === 0) return null;

  const sorted = [...logs].sort((a, b) => new Date(b.period_start) - new Date(a.period_start));
  const latest = sorted[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const periodStart = new Date(latest.period_start);
  const cycleLength = latest.cycle_length || 28;
  const periodDuration = latest.period_end
    ? diffDays(new Date(latest.period_end), periodStart) + 1
    : 5;

  const dayOfCycle = diffDays(today, periodStart) + 1;

  let phase, phaseDay;
  if (dayOfCycle <= periodDuration) {
    phase = 'Menstruation';
    phaseDay = dayOfCycle;
  } else if (dayOfCycle <= 13) {
    phase = 'Follicular';
    phaseDay = dayOfCycle - periodDuration;
  } else if (dayOfCycle <= 15) {
    phase = 'Ovulation';
    phaseDay = dayOfCycle - 13;
  } else if (dayOfCycle <= cycleLength) {
    phase = 'Luteal';
    phaseDay = dayOfCycle - 15;
  } else {
    phase = 'Late / Overdue';
    phaseDay = dayOfCycle - cycleLength;
  }

  const nextPeriod = addDays(periodStart, cycleLength);
  const daysUntilNext = diffDays(nextPeriod, today);

  let avgCycle = cycleLength;
  if (sorted.length >= 2) {
    const deltas = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      deltas.push(diffDays(new Date(sorted[i].period_start), new Date(sorted[i + 1].period_start)));
    }
    avgCycle = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }

  return { phase, phaseDay, dayOfCycle, nextPeriod, daysUntilNext, avgCycle, periodStart, cycleLength, periodDuration };
}

function getPhaseStyle(phase) {
  switch (phase) {
    case 'Menstruation': return { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', label: 'Menstruation', icon: 'water_drop' };
    case 'Follicular':   return { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', label: 'Follicular',   icon: 'local_florist' };
    case 'Ovulation':    return { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  label: 'Ovulation',    icon: 'brightness_high' };
    case 'Luteal':       return { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',label: 'Luteal',       icon: 'nights_stay' };
    default:             return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Late/Irregular',icon: 'help_outline' };
  }
}

// ─── Phase Ring SVG ──────────────────────────────────────────────────────────

function PhaseRing({ phase, dayOfCycle, cycleLength }) {
  const phases = [
    { name: 'Menstruation', span: 5,  color: '#f43f5e' },
    { name: 'Follicular',   span: 8,  color: '#38bdf8' },
    { name: 'Ovulation',    span: 3,  color: '#22c55e' },
    { name: 'Luteal',       span: 14, color: '#a78bfa' },
  ];
  const total = cycleLength || 28;
  const size = 210;
  const strokeW = 16;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;

  let offset = 0;
  const style = getPhaseStyle(phase);

  return (
    <div className="phase-ring-wrapper">
      <svg width={cx * 2} height={cx * 2} className="phase-ring-svg">
        <defs>
          <filter id="phaseGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
            <feComponentTransfer in="offsetBlur">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeW - 2} opacity={0.15} />
        {/* Phase arcs */}
        {phases.map((p) => {
          const len = (p.span / total) * circ;
          const gap = circ - len;
          const rot = (offset / total) * 360 - 90;
          offset += p.span;
          const isActive = phase === p.name;
          return (
            <circle
              key={p.name}
              cx={cx} cy={cx} r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={isActive ? strokeW : strokeW - 6}
              strokeDasharray={`${len} ${gap}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform={`rotate(${rot} ${cx} ${cx})`}
              opacity={isActive ? 1 : 0.12}
              filter={isActive ? "url(#phaseGlow)" : ""}
              style={{ transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
          );
        })}
        {/* Day number */}
        <text x={cx} y={cx - 16} textAnchor="middle" fill={style.color} fontSize="42" fontWeight="900" fontFamily="Outfit, Inter, sans-serif" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
          {dayOfCycle}
        </text>
        <text x={cx} y={cx + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="800" letterSpacing="1.5" style={{ textTransform: 'uppercase', opacity: 0.8 }}>
          Day of Cycle
        </text>
        <text x={cx} y={cx + 32} textAnchor="middle" fill={style.color} fontSize="11" fontWeight="700" style={{ letterSpacing: '0.4px' }}>
          {style.label}
        </text>
      </svg>
      <div className="phase-label-below" style={{ color: phase === 'Late / Overdue' ? '#f59e0b' : style.color, background: phase === 'Late / Overdue' ? 'rgba(245,158,11,0.08)' : style.bg, border: `1px solid ${phase === 'Late / Overdue' ? '#f59e0b44' : style.color + '33'}` }}>
        <span className="material-icons-round" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
        {style.label} Phase
      </div>
    </div>
  );
}

// ─── Cycle Calendar ───────────────────────────────────────────────────────────

function CycleCalendar({ logs, userEvents = [], onDayClick }) {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const periodDays = new Set();
  const fertileWindow = new Set();
  const ovulationDays = new Set();
  const predictedDays = new Set();

  logs.forEach((log) => {
    const start = new Date(log.period_start);
    const cl = log.cycle_length || 28;
    const duration = log.period_end
      ? diffDays(new Date(log.period_end), start) + 1
      : 5;

    for (let d = 0; d < duration; d++) {
      const day = addDays(start, d);
      if (day.getFullYear() === year && day.getMonth() === month) {
        periodDays.add(day.getDate());
      }
    }

    const ov = addDays(start, cl - 14);
    if (ov.getFullYear() === year && ov.getMonth() === month) {
      ovulationDays.add(ov.getDate());
    }

    for (let f = -5; f <= 0; f++) {
      const fd = addDays(ov, f);
      if (fd.getFullYear() === year && fd.getMonth() === month) {
        fertileWindow.add(fd.getDate());
      }
    }

    // Predicted next period
    const nextStart = addDays(start, cl);
    for (let d = 0; d < 5; d++) {
      const day = addDays(nextStart, d);
      if (day.getFullYear() === year && day.getMonth() === month && !periodDays.has(day.getDate())) {
        predictedDays.add(day.getDate());
      }
    }
  });

  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return (
    <div className="cycle-calendar-card">
      <div className="cycle-calendar-nav">
        <button className="cal-nav-btn" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
          <span className="material-icons-round">chevron_left</span>
        </button>
        <span className="cal-month-label">{monthName}</span>
        <button className="cal-nav-btn" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
          <span className="material-icons-round">chevron_right</span>
        </button>
      </div>

      <div className="cycle-calendar-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
          <span key={i} className="cal-weekday">{d}</span>
        ))}
        {Array.from({ length: cellCount }, (_, i) => {
          const dayNum = i - firstDay + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            return <span key={i} className="cal-day empty" />;
          }
          const isToday    = today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;
          const isPeriod   = periodDays.has(dayNum);
          const isOvul     = ovulationDays.has(dayNum);
          const isFertile  = fertileWindow.has(dayNum) && !isPeriod;
          const isPredicted= predictedDays.has(dayNum) && !isPeriod;

          const dayEvents = userEvents.filter(e => {
            const ed = new Date(e.appointment_date);
            return ed.getDate() === dayNum && ed.getMonth() === month && ed.getFullYear() === year;
          });

          return (
            <button
              key={i}
              className={`cal-day${isToday ? ' today' : ''}${isPeriod ? ' period' : ''}${isOvul ? ' ovulation' : ''}${isFertile ? ' fertile' : ''}${isPredicted ? ' predicted' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
              onClick={() => onDayClick(new Date(year, month, dayNum))}
              title={
                dayEvents.length > 0 ? `${dayEvents.length} events: ${dayEvents.map(e => e.title).join(', ')}` :
                isPeriod   ? 'Period day — click to log' :
                isOvul     ? 'Estimated ovulation' :
                isFertile  ? 'Fertile window' :
                isPredicted? 'Predicted next period' :
                             `Log period start: ${dayNum}`
              }
            >
              <div className="day-num-box">{dayNum}</div>
              {dayEvents.length > 0 && (
                <div className="event-markers-mini">
                   {dayEvents.slice(0, 3).map((e, idx) => (
                      <div key={idx} className={`event-marker-dot ${e.type?.toLowerCase() || 'other'}`} />
                   ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span className="legend-item"><span className="legend-dot period-dot" /> Period</span>
        <span className="legend-item"><span className="legend-dot fertile-dot" /> Fertile</span>
        <span className="legend-item"><span className="legend-dot ovul-dot" /> Ovulation</span>
        <span className="legend-item"><span className="legend-dot predicted-dot" /> Predicted</span>
        <span className="legend-item"><span className="legend-dot event-dot" style={{background: 'var(--primary)'}} /> Health Plans</span>
      </div>
    </div>
  );
}

// ─── Insights Card ─────────────────────────────────────────────────────────

function CycleInsights({ info, phaseStyle }) {
  if (!info) return null;

  const tips = {
    'Menstruation': [
      'Stay hydrated — aim for 8+ glasses of water daily.',
      'A heating pad can ease cramps significantly.',
      'Iron-rich foods like lentils and spinach replenish nutrients.'
    ],
    'Follicular': [
      'Rising estrogen boosts your energy — great time to exercise!',
      'Your brain is sharper now — tackle complex tasks today.',
      'Social energy is higher in this phase.'
    ],
    'Ovulation': [
      'Peak fertility window — libido is naturally higher.',
      'You may feel at your most confident and energetic.',
      'This is a great time for creative projects and socializing.'
    ],
    'Luteal': [
      'Progesterone rises — prioritize rest and self-care.',
      'Magnesium-rich foods can help with PMS symptoms.',
      'Mood dips are normal — be gentle with yourself.'
    ],
    'Late / Overdue': [
      'Stress, travel, or illness can delay your cycle.',
      'Consider a pregnancy test if needed.',
      'Talk to a healthcare provider if delays are frequent.'
    ]
  };

  const phaseTips = tips[info.phase] || [];

  return (
    <div className="cycle-insights-card">
      <h4 className="cycle-card-title">
        <span className="material-icons-round">lightbulb</span>
        Phase Insights
      </h4>
      <div className="insight-phase-banner" style={{ borderColor: phaseStyle.color, background: phaseStyle.bg }}>
        <span className="material-icons-round insight-icon" style={{ color: phaseStyle.color, fontVariationSettings: "'FILL' 1" }}>
          {phaseStyle.icon}
        </span>
        <div>
          <strong style={{ color: phaseStyle.color }}>{phaseStyle.label} Phase</strong>
          <p className="insight-description">{phaseDescriptions[info.phase]}</p>
        </div>
      </div>
      <ul className="insight-tips-list">
        {phaseTips.map((tip, i) => (
          <li key={i} className="insight-tip-item">
            <span className="material-icons-round tip-icon">tips_and_updates</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────────────────

function DeleteConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="cycle-delete-confirm">
      <span className="material-icons-round delete-confirm-icon">delete_forever</span>
      <p>Delete this period log?</p>
      <div className="delete-confirm-actions">
        <button className="delete-confirm-btn cancel" onClick={onCancel}>Keep it</button>
        <button className="delete-confirm-btn confirm" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  );
}

// ─── Main CycleTracker Component ─────────────────────────────────────────────

export default function CycleTracker({ patient, userEvents = [], onDayClick }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(null);
  const [logEndDate, setLogEndDate] = useState('');
  const [logCycleLen, setLogCycleLen] = useState(28);
  const [logPeriodDuration, setLogPeriodDuration] = useState(5);
  const [logNotes, setLogNotes] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Retrieve token from either storage (matching App.jsx logic)
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = useCallback(() => {
    if (!token) return;
    setIsLoading(true);
    
    fetch(`${API_BASE_URL}/cycle-logs`, { headers })
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); })
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleDaySelect = (date) => {
    // Determine if we should open period log or planner
    // For now, let's prioritize opening the planner if onDayClick is provided
    if (onDayClick) {
        onDayClick(date);
    } else {
        openLogModal(date);
    }
  };

  const openLogModal = (date) => {
    const startDateStr = toISODate(date);
    setSelectedLogDate(startDateStr);
    
    // Auto-calculate end date based on default duration (5 days)
    const endDate = addDays(date, 4); // 5 days total including start
    setLogEndDate(toISODate(endDate));
    setLogPeriodDuration(5);
    setLogCycleLen(28);
    setLogNotes('');
    setShowLogModal(true);
  };

  const handleLogToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    openLogModal(today);
  };

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (selectedLogDate && logPeriodDuration) {
      const start = new Date(selectedLogDate);
      const end = addDays(start, logPeriodDuration - 1);
      setLogEndDate(toISODate(end));
    }
  }, [selectedLogDate, logPeriodDuration]);

  const handleSubmitLog = async () => {
    if (!selectedLogDate || !token) return;
    setIsLogging(true);
    try {
      const body = {
        period_start: selectedLogDate,
        ...(logEndDate && { period_end: logEndDate }),
        cycle_length: logCycleLen,
        ...(logNotes && { notes: logNotes }),
      };
      const res = await fetch(`${API_BASE_URL}/cycle-logs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      showToast('Period logged successfully ✓');
      setShowLogModal(false);
      fetchLogs();
    } catch {
      showToast('Failed to save log', 'error');
    } finally {
      setIsLogging(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!token) return;
    await fetch(`${API_BASE_URL}/cycle-logs/${id}`, { method: 'DELETE', headers });
    setConfirmDeleteId(null);
    showToast('Log deleted');
    fetchLogs();
  };

  // Dynamic slider gradient calculation
  const sliderPercent = Math.round(((logCycleLen - 21) / (40 - 21)) * 100);

  const info = computeCycleInfo(logs);
  const phaseStyle = info ? getPhaseStyle(info.phase) : null;

  return (
    <div className="cycle-tracker-section fade-in">
      {/* Toast */}
      {toast && (
        <div className={`cycle-toast ${toast.type}`}>
          <span className="material-icons-round">{toast.type === 'error' ? 'error_outline' : 'check_circle'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="planner-header-card" style={{marginBottom: '1.5rem'}}>
        <div className="cycle-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div className="cycle-header-left" style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div className="cycle-icon-badge">
              <span className="material-icons-round">favorite</span>
            </div>
            <div>
              <h2 style={{margin: '0 0 0.25rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-main), #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Cycle Tracker</h2>
              <p className="cycle-subtitle" style={{margin: 0}}>Track your menstrual health &amp; understand your body</p>
            </div>
          </div>
          <button className="btn-log-period" onClick={handleLogToday}>
            <span className="material-icons-round">add_circle</span>
            Log Period
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="cycle-loading">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      ) : logs.length === 0 ? (
        /* Empty State */
        <div className="cycle-empty-state">
          <div className="cycle-empty-icon-wrap">
            <span className="material-icons-round" style={{ fontSize: '3.5rem', color: 'rgba(244,63,94,0.35)' }}>calendar_today</span>
          </div>
          <h3>Start Tracking Your Cycle</h3>
          <p>Log your first period to unlock personalized insights about your phases, ovulation window, and health patterns.</p>
          <div className="cycle-empty-features">
            {[
              { icon: 'donut_large', label: 'Phase tracking' },
              { icon: 'calendar_month', label: 'Period prediction' },
              { icon: 'brightness_high', label: 'Ovulation window' },
              { icon: 'lightbulb', label: 'Health insights' },
            ].map(f => (
              <div key={f.label} className="cycle-empty-feature">
                <span className="material-icons-round" style={{ color: '#f43f5e', fontSize: '1.3rem' }}>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-log-period large" onClick={handleLogToday}>
            <span className="material-icons-round">add_circle</span>
            Log My First Period
          </button>
        </div>
      ) : (
        <div className="cycle-main-grid">
          {/* Left column */}
          <div className="cycle-left-col">
            {/* Phase Ring Card */}
            <div className="cycle-stat-card phase-card">
              <h4 className="cycle-card-title">
                <span className="material-icons-round">donut_large</span>
                Current Phase
              </h4>
              {info && (
                <PhaseRing
                  phase={info.phase}
                  dayOfCycle={info.dayOfCycle}
                  cycleLength={info.cycleLength}
                />
              )}
            </div>

            {/* Quick Stats */}
            <div className="cycle-quick-stats">
              <div className="cycle-stat-pill primary">
                <span className="material-icons-round stat-icon" style={{ color: '#f43f5e' }}>calendar_month</span>
                <div>
                  <span className="stat-pill-label">Next Period</span>
                  <span className="stat-pill-value">
                    {info
                      ? info.daysUntilNext > 0
                        ? `in ${info.daysUntilNext}d`
                        : info.daysUntilNext === 0
                          ? 'Today'
                          : 'Overdue'
                      : '—'}
                  </span>
                  <span className="stat-pill-date">
                    {info ? info.nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              </div>
              <div className="cycle-stat-pill">
                <span className="material-icons-round stat-icon" style={{ color: '#a78bfa' }}>loop</span>
                <div>
                  <span className="stat-pill-label">Avg Cycle</span>
                  <span className="stat-pill-value">{info ? `${info.avgCycle}` : '—'}</span>
                  <span className="stat-pill-date">days</span>
                </div>
              </div>
              <div className="cycle-stat-pill">
                <span className="material-icons-round stat-icon" style={{ color: '#22c55e' }}>brightness_high</span>
                <div>
                  <span className="stat-pill-label">Ovulation Est.</span>
                  <span className="stat-pill-value">
                    {info ? addDays(info.periodStart, info.cycleLength - 14).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                  <span className="stat-pill-date">estimated</span>
                </div>
              </div>
              <div className="cycle-stat-pill">
                <span className="material-icons-round stat-icon" style={{ color: '#38bdf8' }}>water_drop</span>
                <div>
                  <span className="stat-pill-label">Period Length</span>
                  <span className="stat-pill-value">{info ? `${info.periodDuration}` : '—'}</span>
                  <span className="stat-pill-date">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="cycle-right-col">
            {/* Calendar */}
            <CycleCalendar logs={logs} userEvents={userEvents} onDayClick={handleDaySelect} />

            {/* Insights */}
            {info && phaseStyle && (
              <CycleInsights info={info} phaseStyle={phaseStyle} />
            )}

            {/* Log History */}
            <div className="cycle-history-card">
              <h4 className="cycle-card-title">
                <span className="material-icons-round">history</span>
                Recent Logs
                <span className="history-count-badge">{logs.length}</span>
              </h4>
              <div className="cycle-history-list">
                {logs.slice(0, 6).map((log) => (
                  <div key={log.id} className="cycle-history-item">
                    {confirmDeleteId === log.id ? (
                      <DeleteConfirmDialog
                        onConfirm={() => handleDeleteLog(log.id)}
                        onCancel={() => setConfirmDeleteId(null)}
                      />
                    ) : (
                      <>
                        <div className="history-item-left">
                          <span className="history-dot" />
                          <div>
                            <span className="history-date">
                              {new Date(log.period_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                            {log.period_end && (
                              <span className="history-end">
                                → {new Date(log.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {' '}
                                <em>({diffDays(new Date(log.period_end), new Date(log.period_start)) + 1} days)</em>
                              </span>
                            )}
                            {log.notes && <span className="history-note">📝 {log.notes}</span>}
                          </div>
                        </div>
                        <div className="history-item-right">
                          <span className="history-cycle-len">{log.cycle_length || 28}d</span>
                          <button className="history-delete-btn" onClick={() => setConfirmDeleteId(log.id)} title="Delete log">
                            <span className="material-icons-round">delete_outline</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Period Modal */}
      {showLogModal && createPortal(
        <div className="modal-overlay fade-in" onClick={() => setShowLogModal(false)}>
          <div className="modal-content glass-modal slide-in-top cycle-log-modal" onClick={e => e.stopPropagation()}>
            <div className="cycle-modal-header">
              <div className="cycle-modal-title">
                <div className="cycle-modal-icon">
                  <span className="material-icons-round" style={{ color: '#f43f5e', fontVariationSettings: "'FILL' 1" }}>water_drop</span>
                </div>
                <div>
                  <h3>Log Period</h3>
                  <p className="cycle-modal-date">{selectedLogDate}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowLogModal(false)}>
                <span className="material-icons-round">close</span>
              </button>
            </div>

            <div className="cycle-modal-body">
              <div className="cycle-form-group duration-selector-group">
                <label>Period Duration <span className="selected-val-hint">{logPeriodDuration} Days</span></label>
                <div className="custom-duration-picker">
                  {[...Array(10)].map((_, i) => (
                    <button 
                      key={i+1} 
                      className={`duration-chip ${logPeriodDuration === i+1 ? 'active' : ''}`}
                      onClick={() => setLogPeriodDuration(i+1)}
                      type="button"
                    >
                      {i+1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cycle-form-row">
                <div className="cycle-form-group">
                  <label>Start Date</label>
                  <div className="cycle-input-wrapper">
                    <span className="material-icons-round input-icon-inner">calendar_today</span>
                    <input
                      type="date"
                      value={selectedLogDate || ''}
                      onChange={e => setSelectedLogDate(e.target.value)}
                      className="cycle-input"
                    />
                  </div>
                </div>
                <div className="cycle-form-group">
                  <label>End Date <span className="optional-tag">(Optional)</span></label>
                  <div className="cycle-input-wrapper">
                    <span className="material-icons-round input-icon-inner">event_available</span>
                    <input
                      type="date"
                      value={logEndDate}
                      min={selectedLogDate}
                      onChange={e => setLogEndDate(e.target.value)}
                      className="cycle-input"
                    />
                  </div>
                </div>
              </div>


              <div className="cycle-form-group">
                <label>
                  Cycle Length
                  <span className="cycle-len-badge">{logCycleLen} days</span>
                </label>
                <input
                  type="range"
                  min="21" max="40"
                  value={logCycleLen}
                  onChange={e => setLogCycleLen(Number(e.target.value))}
                  className="cycle-range"
                  style={{
                    background: `linear-gradient(to right, #f43f5e ${sliderPercent}%, rgba(255,255,255,0.08) ${sliderPercent}%)`
                  }}
                />
                <div className="range-labels">
                  <span>21</span><span>28</span><span>35</span><span>40</span>
                </div>
              </div>

              <div className="cycle-form-group">
                <label>Notes <span className="optional-tag">(Optional)</span></label>
                <div className="cycle-input-wrapper">
                  <span className="material-icons-round input-icon-inner textarea-icon">description</span>
                  <textarea
                    placeholder="e.g. Heavy flow, cramping, spotting..."
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    className="cycle-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <button
                className="btn-log-submit"
                onClick={handleSubmitLog}
                disabled={isLogging || !selectedLogDate}
              >
                {isLogging
                  ? <><span className="material-icons-round" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span> Saving...</>
                  : <><span className="material-icons-round">check_circle</span> Save Log</>
                }
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const phaseDescriptions = {
  'Menstruation': 'Your period is active. Rest, stay hydrated, and use gentle heat for cramps. Iron-rich foods help replenish nutrients.',
  'Follicular': 'Estrogen is rising. Energy increases, your mood lifts, and your body prepares to release an egg. Great time for exercise.',
  'Ovulation': 'Peak fertility window. Estrogen peaks and an egg is released. You may feel your most energetic and confident right now.',
  'Luteal': 'Post-ovulation phase. Progesterone rises to prepare the body. PMS symptoms like bloating or mood swings may appear.',
  'Late / Overdue': 'Your period may be later than expected. Stress, travel, or hormonal changes can delay cycles. Consider a pregnancy test if needed.',
};
