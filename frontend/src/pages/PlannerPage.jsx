import React from 'react';

const PlannerPage = ({ userEvents, openNewEventModal, handleEditEvent, handleDeleteEvent }) => {
  return (
    <div className="planner-full-section slide-in-bottom" style={{maxWidth: '1000px', margin: '0 auto'}}>
      <div className="planner-header-card">
        <div className="schedule-header" style={{margin: 0, padding: 0, border: 'none'}}>
          <div className="header-title-group">
            <h3>Personal Health Planner</h3>
            <div className="ux-prompt-small">Manage your appointments, tests, and routines.</div>
          </div>
          <button className="date-display" onClick={() => openNewEventModal()} style={{border: 'none', cursor: 'pointer', fontFamily: 'inherit'}}>
            New Plan
          </button>
        </div>
      </div>

      <div className="planner-agenda-container" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem'}}>
        {userEvents.length > 0 ? userEvents.sort((a,b) => new Date(a.appointment_date) - new Date(b.appointment_date)).map(event => {
          const typeMap = {
            'Appointment': 'type-appointment',
            'Exercise': 'type-exercise',
            'Lab Test': 'type-lab-test',
            'Medication': 'type-medication',
            'Other': 'type-other'
          };
          const typeClass = typeMap[event.type] || 'type-other';
          
          return (
            <div key={event.id} className={`agenda-card-premium ${typeClass} fade-in`}>
              <div className={`agenda-date-gradient ${typeClass}`}>
                  <span style={{fontSize: '0.8rem', opacity: 0.9, fontWeight: 600}}>{new Date(event.appointment_date).toLocaleString('en-US', { month: 'short' })}</span>
                  <span style={{fontSize: '1.5rem', fontWeight: 800}}>{new Date(event.appointment_date).getDate()}</span>
              </div>
              <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                    <h4 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem'}}>{event.title}</h4>
                    <span className={`event-type-badge ${typeClass}`}>{event.type}</span>
                  </div>
                  <p style={{fontSize: '0.9rem', margin: 0, color: 'var(--text-muted)', lineHeight: '1.5', flex: 1}}>{event.description}</p>
                  <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600}}>
                    {event.location && <span style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}><span className="material-icons-round" style={{fontSize: '1.1rem'}}>place</span> {event.location}</span>}
                    <span style={{display: 'flex', alignItems: 'center', gap: '0.3rem'}}><span className="material-icons-round" style={{fontSize: '1.1rem'}}>schedule</span> {new Date(event.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
              </div>
                <button className="icon-btn-edit" onClick={() => handleEditEvent(event)} style={{position: 'absolute', bottom: '1.2rem', right: '3.5rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', opacity: 0.4, transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}>
                  <span className="material-icons-round">edit_note</span>
                </button>
                <button className="icon-btn-delete" onClick={() => handleDeleteEvent(event.id)} style={{position: 'absolute', bottom: '1.2rem', right: '1.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, transition: 'all 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}>
                  <span className="material-icons-round">delete_outline</span>
                </button>
            </div>
          );
        }) : (
          <div className="planner-empty-premium fade-in">
            <div className="empty-illustration-glow">
                <div className="illustration-circles"></div>
                <span className="material-icons-round illustration-icon">event_note</span>
            </div>
            <h3>Your Schedule is Clear</h3>
            <p style={{color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto 1.5rem'}}>You don't have any upcoming appointments, tests, or exercises planned.</p>
            <button className="btn-primary" onClick={() => openNewEventModal()} style={{padding: '0.8rem 2rem', width: 'max-content', flexShrink: 0}}>
                <span className="material-icons-round" style={{marginRight: '0.5rem', fontSize: '1.2rem', verticalAlign: 'middle'}}>add</span> 
                Create First Plan
            </button>
            <style>{`
                .empty-illustration-glow {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .illustration-icon {
                    font-size: 3.5rem !important;
                    color: var(--primary);
                    z-index: 2;
                }
                .illustration-circles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--primary-light);
                    opacity: 0.3;
                    animation: pulse-ring 3s infinite;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.3; }
                    50% { transform: scale(1.1); opacity: 0.1; }
                    100% { transform: scale(0.8); opacity: 0.3; }
                }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerPage;
