import React from 'react';

const MedicationsPage = ({ meds, handleTakeMed, setIsAddMedModalOpen, fetchHistory, handleDeleteMed }) => {
  return (
    <div className="meds-section fade-in">
      <div className="meds-dashboard">
        <section className="schedule-container">
           <div className="schedule-header">
               <div className="header-title-group">
                   <h3>Today's Medication Plan</h3>
                   <div className="ux-prompt-small">Stick to your schedule for better health.</div>
               </div>
               <div className="date-display">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
           </div>
           {meds.length > 0 ? (
             <div className="daily-timeline">
               {[
                 { name: 'Morning', icon: 'wb_sunny', color: '#f59e0b' },
                 { name: 'Noon', icon: 'restaurant', color: '#fbbf24' },
                 { name: 'Evening', icon: 'wb_twilight', color: '#6366f1' },
                 { name: 'Bedtime', icon: 'bedtime', color: '#1e1b4b' }
               ].map(slot => {
                 const slotMeds = meds.filter(m => m.time && m.time.split(',').map(t => t.trim()).includes(slot.name));
                 return (
                   <div key={slot.name} className={`timeline-slot ${slotMeds.length > 0 ? 'active' : ''}`}>
                       <div className="slot-header">
                           <span className="material-icons-round" style={{color: slot.color}}>{slot.icon}</span>
                           <span className="slot-name">{slot.name}</span>
                       </div>
                       <div className="slot-meds">
                           {slotMeds.length > 0 ? slotMeds.map(med => {
                             const isSlotTaken = med.taken_today && med.taken_today.includes(slot.name);
                             return (
                               <div key={med.id} className={`mini-med-card ${isSlotTaken ? 'taken' : ''}`}>
                                   <div className="med-symbol" style={{color: isSlotTaken ? '#16a34a' : 'var(--primary)', opacity: isSlotTaken ? 1 : 0.6}}>
                                       <span className="material-icons-round" style={{fontSize: '1.2rem'}}>
                                           {med.icon === 'pill' ? 'medication' : 
                                            med.icon === 'liquid' ? 'water_drop' : 
                                            med.icon === 'shot' ? 'vaccines' : 
                                            med.icon === 'capsule' ? 'medication_liquid' : 'pill'}
                                       </span>
                                   </div>
                                   <div className="med-info">
                                       <h4>{med.name}</h4>
                                       <p>{med.dosage}</p>
                                   </div>
                                   <button 
                                       className={`take-btn ${isSlotTaken ? 'active' : ''}`} 
                                       title={isSlotTaken ? "Dose taken" : "Mark as taken"}
                                       onClick={() => !isSlotTaken && handleTakeMed(med.id, slot.name)}
                                       disabled={isSlotTaken}
                                   >
                                       <span className="material-icons-round">{isSlotTaken ? 'done_all' : 'check'}</span>
                                   </button>
                               </div>
                             );
                           }) : (
                             <div className="empty-slot-illustration" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0', opacity: 0.8 }}>
                               <span className="material-icons-round" style={{fontSize: '1.8rem', color: 'var(--primary)', opacity: 0.4, marginBottom: '0.5rem'}}>check_circle_outline</span>
                               <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500}}>No medications</p>
                             </div>
                           )}
                       </div>
                   </div>
                 )
               })}
             </div>
           ) : (
             <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5}}>
               <span className="material-icons-round" style={{fontSize: '4rem'}}>calendar_today</span>
               <p>No health plans scheduled yet.</p>
             </div>
           )}
        </section>

        <section className="cabinet-section">
           <div className="section-header-flex">
               <h3>My Medicine Cabinet</h3>
               <button className="btn-primary-horizontal" onClick={() => setIsAddMedModalOpen(true)}>
                   <span className="material-icons-round">add_circle</span>
                   <span>Add Medication</span>
               </button>
           </div>
           
           <div className="cabinet-grid">
               {meds.map(med => {
                 const isTakenToday = med.last_taken && new Date(med.last_taken).toDateString() === new Date().toDateString();
                 const stockPercent = (med.stock / (med.total_stock || 1)) * 100;
                 return (
                   <div key={med.id} className={`med-card-premium ${isTakenToday ? 'taken' : ''}`}>
                       {isTakenToday && (
                           <div className="taken-badge">
                               <span className="material-icons-round" style={{fontSize: '0.9rem'}}>verified</span>
                               TAKEN TODAY
                           </div>
                       )}
                       <div className="med-icon-box">
                           <span className="material-icons-round">
                               {med.icon === 'pill' ? 'medication' : 
                                med.icon === 'liquid' ? 'water_drop' : 
                                med.icon === 'shot' ? 'vaccines' : 
                                med.icon === 'capsule' ? 'medication_liquid' : 'pill'}
                           </span>
                       </div>
                       <div className="med-details">
                           <h4>{med.name}</h4>
                           <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center'}}>
                               <span className="dosage">{med.dosage}</span>
                               <span className="frequency" style={{background: 'var(--bg-main)', padding: '0.1rem 0.6rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600}}>
                                   {med.frequency}
                               </span>
                               <button 
                                  className="btn-history-mini" 
                                  onClick={() => fetchHistory(med)}
                                  style={{background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7}}
                                  title="View Intake History"
                               >
                                   <span className="material-icons-round" style={{fontSize: '1.2rem'}}>history</span>
                               </button>
                           </div>
                           
                           <div className="stock-progress-container">
                               <div className="stock-label-row">
                                   <span>Stock Remaining</span>
                                   <span>{med.stock} doses</span>
                               </div>
                               <div className="stock-progress-bar">
                                   <div 
                                       className={`stock-bar-fill ${med.stock < 5 ? 'low' : ''}`} 
                                       style={{width: `${stockPercent}%`}}
                                   ></div>
                               </div>
                               {med.stock < 5 && <p style={{color: '#f43f5e', fontSize: '0.75rem', fontWeight: 700, marginTop: '5px'}}>Low stock - refill soon!</p>}
                           </div>
                       </div>
                       
                       <div className="btn-delete-med" onClick={() => handleDeleteMed(med.id)} title="Delete medication">
                           <span className="material-icons-round">delete_outline</span>
                       </div>
                   </div>
                 );
               })}
               
               <div 
                   className="med-card-premium add-new" 
                   style={{borderStyle: 'dashed', cursor: 'pointer', justifyContent: 'center', alignItems: 'center', background: 'transparent', opacity: 0.6}}
                   onClick={() => setIsAddMedModalOpen(true)}
               >
                   <div style={{textAlign: 'center', color: 'var(--text-muted)'}}>
                       <span className="material-icons-round" style={{fontSize: '2.5rem'}}>add_pills</span>
                       <p style={{marginTop: '0.5rem', fontWeight: 700}}>Fast Add</p>
                   </div>
               </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default MedicationsPage;
