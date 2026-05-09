import React from 'react';
import '../styles/dashboard_elite.css';

const Dashboard = ({ 
  patient, 
  meds, 
  userEvents, 
  analysis, 
  handleAnalyze, 
  selectedSymptoms, 
  toggleSymptom, 
  availableChips, 
  customSymptom, 
  setCustomSymptom,
  setActiveTab,
  isCheckerCollapsed,
  setIsCheckerCollapsed 
}) => {

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };



  const upcomingMeds = meds.filter(m => {
    const hour = new Date().getHours();
    let slot = '';
    if (hour >= 6  && hour < 11) slot = 'Morning';
    else if (hour >= 11 && hour < 14) slot = 'Noon';
    else if (hour >= 17 && hour < 21) slot = 'Evening';
    else if (hour >= 21 || hour < 5)  slot = 'Bedtime';
    return m.time?.includes(slot) && (!m.taken_today || !m.taken_today.includes(slot));
  }).slice(0, 3);

  const nextAppointment = userEvents
    .filter(e => new Date(e.appointment_date) > new Date())
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0];

  const getRiskClass = (level) => {
    if (!level) return '';
    return level.toLowerCase() === 'high' ? 'risk-high' : level.toLowerCase() === 'medium' ? 'risk-medium' : 'risk-low';
  };

  const isAnalyzing = analysis?.status === 'Analyzing...';

  // Derive a simple health score from available data
  const medsTotal = meds.length;
  const medsTaken = meds.filter(m => m.taken_today && m.taken_today.length > 0).length;
  const adherencePct = medsTotal > 0 ? Math.round((medsTaken / medsTotal) * 100) : 100;
  const healthScore = Math.min(100, Math.round((adherencePct * 0.4) + 60)); // baseline 60
  const scoreOffset = Math.round(188 * (1 - healthScore / 100));

  return (
    <div className="dashboard-elite-wrapper">

      {/* ── Mobile Hero ── */}
      <div className="dash-hero-elite">
        <div className="dash-hero-content">
          <div className="hero-text-area">
            <p className="greeting-text">{getGreeting()},</p>
            <h1 className="user-name-text">{patient?.username || 'Health Explorer'}</h1>
            <div className="hero-status-area">
              <div className="dash-hero-badge">
                <span className="material-icons-round">verified_user</span>
                <span>All systems active</span>
              </div>
            </div>
          </div>
          <div className="hero-avatar-area">
            <div className="hero-avatar-wrapper">
              <img 
                src={patient?.profile_picture || (patient?.gender?.toLowerCase() === 'female' ? '/female.png' : '/male.png')} 
                alt="Profile" 
                className="hero-avatar-img"
              />
              <div className="avatar-status-dot"></div>
            </div>
          </div>
        </div>
        <div className="hero-visual-accent"></div>
      </div>

      {/* ── Main Layout ── */}
      <div className="dash-main-grid">
        {/* Symptom Checker - NOW AT THE VERY TOP */}
        <div className="dash-ai-section">
          {/* AI Consultation */}
          <div className={`dash-ai-widget ${isCheckerCollapsed ? 'collapsed' : ''}`}>
            <div className="widget-header" onClick={() => analysis && setIsCheckerCollapsed(!isCheckerCollapsed)} style={{ cursor: analysis ? 'pointer' : 'default' }}>
              <h3>
                <span className="material-icons-round">psychology</span>
                How are you feeling today?
              </h3>
              <div className="widget-header-actions">
                {isCheckerCollapsed && <span className="material-icons-round" style={{ opacity: 0.5 }}>unfold_more</span>}
                <div className="ai-status-badge">
                  <span className="dot" />
                  Online
                </div>
              </div>
            </div>

            <div className="widget-collapsible-content">
              <p className="widget-subtitle">
                Describe your symptoms or select indicators below. Our AI will analyze your health state instantly.
              </p>

              <div className="dash-ai-input-wrapper">
                <span className="material-icons-round">search</span>
                <input
                  type="text"
                  className="dash-ai-input"
                  placeholder="e.g. Mild headache, feverish..."
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (selectedSymptoms.length > 0 || customSymptom.trim()) && handleAnalyze()}
                />
                <button 
                  className="btn-ai-submit" 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || (selectedSymptoms.length === 0 && !customSymptom.trim())}
                >
                  <span className="material-icons-round">
                    {isAnalyzing ? 'hourglass_top' : 'auto_awesome'}
                  </span>
                  {isAnalyzing ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>

              <div className="dash-chips-area">
                {availableChips.slice(0, 8).map((s, idx) => (
                  <div
                    key={idx}
                    className={`elite-chip ${selectedSymptoms.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis Result */}
          {analysis && !isAnalyzing && analysis.top_condition && (
            <div className={`dash-analysis-card ${getRiskClass(analysis.risk_level)} fade-in`}>
              <div className="accent-bar" />
              <div className="analysis-card-header">
                <div>
                  <h3>Latest Assessment</h3>
                </div>
                <span className={`risk-badge-elite ${analysis.risk_level?.toLowerCase()}`}>
                  {analysis.risk_level} Risk
                </span>
              </div>
              <div className="analysis-condition">{analysis.top_condition}</div>
              <p className="analysis-explanation">{analysis.explanation}</p>

              {/* Related Predictions */}
              {analysis.possibilities && analysis.possibilities.length > 1 && (
                <div className="analysis-predictions">
                  <h4>Related Predictions</h4>
                  <div className="prediction-list">
                    {analysis.possibilities.slice(1).map((p, idx) => (
                      <div key={idx} className="prediction-item">
                        <div className="prediction-info">
                          <span className="prediction-name">{p.condition}</span>
                          <span className="prediction-pct">{p.match_percentage}% match</span>
                        </div>
                        <div className="prediction-bar-bg">
                          <div className="prediction-bar-fill" style={{ width: `${p.match_percentage}%` }} />
                        </div>
                        <div className="prediction-insight">
                          <p>{p.explanation}</p>
                          {p.action_steps && p.action_steps.length > 0 && (
                            <ul className="prediction-steps">
                              {p.action_steps.slice(0, 2).map((step, sIdx) => (
                                <li key={sIdx}>{step}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Recommendations (Action Steps) */}
              {analysis.action_steps && analysis.action_steps.length > 0 && (
                <div className="analysis-actions">
                  <h4>Primary Recommendations</h4>
                  <ul className="action-list-elite">
                    {analysis.action_steps.map((step, i) => (
                      <li key={i}>
                        <span className="material-icons-round">check_circle</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Health Score Bar (Desktop) ── */}
        <div className="dash-health-score-bar">
          <div className="health-score-left">
            <div className="health-score-ring">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="#4361ee" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <circle className="score-track" cx="36" cy="36" r="30" />
                <circle
                  className="score-fill"
                  cx="36" cy="36" r="30"
                  style={{ strokeDashoffset: scoreOffset }}
                />
              </svg>
              <div className="health-score-number">{healthScore}</div>
            </div>
            <div className="health-score-info">
              <h4>Health Score</h4>
              <p>{healthScore >= 80 ? 'Excellent — keep it up!' : healthScore >= 60 ? 'Good — stay consistent.' : 'Needs attention.'}</p>
            </div>
          </div>

          <div className="health-score-right">
            <div className="health-quick-stat">
              <span className="stat-val">{meds.length}</span>
              <span className="stat-lbl">Medications</span>
            </div>
            <div className="health-score-divider" />
            <div className="health-quick-stat">
              <span className="stat-val">{upcomingMeds.length}</span>
              <span className="stat-lbl">Due Now</span>
            </div>
            <div className="health-score-divider" />
            <div className="health-quick-stat">
              <span className="stat-val">{userEvents.filter(e => new Date(e.appointment_date) > new Date()).length}</span>
              <span className="stat-lbl">Upcoming</span>
            </div>
            <div className="health-score-divider" />
            <div className="health-quick-stat">
              <span className="stat-val">{adherencePct}%</span>
              <span className="stat-lbl">Adherence</span>
            </div>
          </div>
        </div>



        {/* SECONDARY ROW */}
        <div className="dash-secondary-row">
          {/* Today's Meds */}
          <div className="dash-card-elite">
            <div className="card-title-row">
              <h3>Today's Medications</h3>
              <span className="btn-view-all" onClick={() => setActiveTab('meds')}>Manage →</span>
            </div>
            {upcomingMeds.length > 0 ? upcomingMeds.map(med => (
              <div key={med.id} className="med-row-mini">
                <div className="med-icon-mini">
                  <span className="material-icons-round">medication</span>
                </div>
                <div className="med-info-mini">
                  <h5>{med.name}</h5>
                  <p>{med.dosage} · {med.time}</p>
                </div>
                <div className="med-status-tag status-pending">Due</div>
              </div>
            )) : (
              <div className="empty-state-mini">
                <span className="material-icons-round">check_circle</span>
                All clear for now!
              </div>
            )}
          </div>

          {/* Next Appointment */}
          <div className="dash-card-elite">
            <div className="card-title-row">
              <h3>Next Appointment</h3>
              <span className="btn-view-all" onClick={() => setActiveTab('planner')}>Planner →</span>
            </div>
            {nextAppointment ? (() => {
              const d = new Date(nextAppointment.appointment_date);
              return (
                <div className="appointment-row">
                  <div className="appt-date-badge">
                    <span className="appt-day">{d.getDate()}</span>
                    <span className="appt-mon">{d.toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className="appt-info">
                    <h5>{nextAppointment.title}</h5>
                    <p>{d.toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })() : (
              <div className="empty-state-mini">
                <span className="material-icons-round">event_available</span>
                No upcoming plans.
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
};

export default Dashboard;
