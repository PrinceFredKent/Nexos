import React, { useState } from 'react';
import { API_BASE_URL } from '../config';


const COMMON_MEDICATIONS = [
  'Paracetamol', 'Panadol', 'Aspirin', 'Ibuprofen', 'Brufen', 'Amoxicillin', 'Azithromycin', 
  'Metronidazole', 'Ciprofloxacin', 'Omeprazole', 'Metformin', 'Amlodipine', 'Atorvastatin', 
  'Loratadine', 'Cetrizine', 'Salbutamol', 'Vitamin D', 'Vitamin C', 'Magnesium', 'Zinc',
  'Artemether-Lumefantrine', 'Coartem', 'Doxycycline', 'Quinine', 'Folic Acid', 'Iron'
];

const AddMedicationModal = ({ isOpen, onClose, onAdd, patient }) => {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Once daily',
    time: 'Morning',
    stock: 30,
    total_stock: 30,
    icon: 'pill'
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', dosage: '', stock: '' });
  
  if (!isOpen && !isAnimatingOut) return null;

  const validateName = (val) => {
    if (!val || val.trim().length < 2) return 'Medication name is required (min 2 characters)';
    return '';
  };
  const validateDosage = (val) => {
    if (!val || !val.trim()) return 'Dosage is required (e.g. 500mg)';
    return '';
  };
  const validateStock = (val) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return 'Stock must be a non-negative number';
    if (n > 9999) return 'Stock cannot exceed 9999';
    return '';
  };

  const handleSelfClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
        onClose();
        setIsAnimatingOut(false);
    }, 280);
  };

  const fetchRecommendation = async (name) => {
    try {
      console.log(`DEBUG: Fetching recommendation for ${name}`);
      const response = await fetch(`${API_BASE_URL}/recommend-medication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          age: patient?.age || 30,
          weight: patient?.weight || '70kg'
        })
      });
      const data = await response.json();
      console.log("DEBUG: Recommendation received:", data);
      
      if (data && data.dosage) {
        setRecommendation(data);
        
        // Calculate new time slots based on the frequency
        let newTimeSlots = 'Morning';
        if (data.frequency === 'Twice daily') newTimeSlots = 'Morning,Evening';
        else if (data.frequency === 'Three times daily') newTimeSlots = 'Morning,Noon,Evening';
        
        setFormData(prev => ({
          ...prev,
          name,
          dosage: data.dosage,
          frequency: data.frequency,
          time: newTimeSlots
        }));
      }
    } catch (err) {
      console.error("Failed to fetch recommendation", err);
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });
    setFieldErrors(prev => ({ ...prev, name: validateName(value) }));
    setRecommendation(null); // Clear recommendation when name is manually changed
    
    if (value.length > 0) {
      const filtered = COMMON_MEDICATIONS.filter(med => 
        med.toLowerCase().startsWith(value.toLowerCase())
      ).slice(0, 5); // Max 5 suggestions
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (name) => {
    setFormData({ ...formData, name });
    setShowSuggestions(false);
    fetchRecommendation(name);
  };

  const toggleTimeSlot = (slot) => {
    let currentSlots = formData.time ? formData.time.split(',').map(s => s.trim()).filter(s => s) : [];
    if (currentSlots.includes(slot)) {
      currentSlots = currentSlots.filter(s => s !== slot);
    } else {
      currentSlots.push(slot);
    }
    setFormData({ ...formData, time: currentSlots.join(',') });
  };

  const handleFrequencyChange = (e, nameOverride, dosageOverride) => {
    const freq = e.target.value;
    let newTime = formData.time;

    if (freq === 'Once daily') newTime = 'Morning';
    else if (freq === 'Twice daily') newTime = 'Morning,Evening';
    else if (freq === 'Three times daily') newTime = 'Morning,Noon,Evening';
    else if (freq === 'As needed') newTime = 'Morning';

    setFormData(prev => ({ 
      ...prev, 
      name: nameOverride || prev.name,
      dosage: dosageOverride || prev.dosage,
      frequency: freq, 
      time: newTime 
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nameErr = validateName(formData.name);
    const dosageErr = validateDosage(formData.dosage);
    const stockErr = validateStock(formData.stock);
    if (nameErr || dosageErr || stockErr) {
      setFieldErrors({ name: nameErr, dosage: dosageErr, stock: stockErr });
      return;
    }
    onAdd(formData);
    handleSelfClose();
  };

  const icons = [
    { id: 'pill', name: 'Pills', icon: 'medication' },
    { id: 'liquid', name: 'Liquid', icon: 'water_drop' },
    { id: 'shot', name: 'Injection', icon: 'vaccines' },
    { id: 'capsule', name: 'Capsule', icon: 'medication_liquid' }
  ];

  const scheduleSlots = [
    { id: 'Morning', icon: 'wb_sunny' },
    { id: 'Noon', icon: 'restaurant' },
    { id: 'Evening', icon: 'wb_twilight' },
    { id: 'Bedtime', icon: 'bedtime' }
  ];

  return (
    <div className={`modal-overlay ${isAnimatingOut ? 'is-closing' : ''}`} onClick={handleSelfClose}>
      <div className={`modal-content glass-modal origin-center ${isAnimatingOut ? 'is-closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Medication</h3>
          <button className="close-btn" type="button" onClick={handleSelfClose}>
            <span className="material-icons-round">close</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-med-form">
          <div className={`form-group input-group ${formData.name ? 'filled' : ''}`} style={{position: 'relative'}}>
            <input 
              type="text" 
              id="medName"
              required 
              placeholder=" "
              value={formData.name}
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <label htmlFor="medName">Medication Name</label>
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            {showSuggestions && (
              <div className="suggestions-dropdown fade-in">
                {suggestions.map((name, idx) => (
                  <div 
                    key={idx} 
                    className="suggestion-item" 
                    onClick={() => selectSuggestion(name)}
                  >
                    <span className="material-icons-round">medical_services</span>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className={`form-group input-group ${formData.dosage ? 'filled' : ''}`}>
              <input 
                type="text" 
                id="dosage"
                className="input-premium-lg"
                required 
                placeholder=" "
                value={formData.dosage}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({...formData, dosage: val});
                  setFieldErrors(prev => ({ ...prev, dosage: validateDosage(val) }));
                }}
              />
              <label htmlFor="dosage">
                Dosage {recommendation && <span className="smart-badge">AI</span>}
              </label>
              {fieldErrors.dosage && <span className="field-error" style={{ bottom: '-1rem' }}>{fieldErrors.dosage}</span>}
            </div>
            <div className="form-group input-group filled">
              <select 
                id="frequency"
                className="input-premium-lg"
                value={formData.frequency}
                onChange={handleFrequencyChange}
              >
                <option>Once daily</option>
                <option>Twice daily</option>
                <option>Three times daily</option>
                <option>As needed</option>
              </select>
              <label htmlFor="frequency">
                Frequency {recommendation && <span className="smart-badge">AI</span>}
              </label>
            </div>
          </div>

          {recommendation && (
            <div className="recommendation-notice fade-in">
              <span className="material-icons-round">info</span>
              <div className="rec-text">
                <strong>Smart Suggestion:</strong> {recommendation.explanation}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Schedule Time (Multiple Select)</label>
            <div className="time-slot-selector">
              {scheduleSlots.map(slot => {
                const isActive = formData.time && formData.time.split(',').includes(slot.id);
                return (
                  <div 
                    key={slot.id} 
                    className={`time-chip ${isActive ? 'active' : ''}`}
                    onClick={() => toggleTimeSlot(slot.id)}
                  >
                    <span className="material-icons-round">{slot.icon}</span>
                    <span>{slot.id}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`form-group input-group ${formData.stock ? 'filled' : ''}`}>
            <input 
              type="number" 
              id="stock"
              placeholder=" "
              value={formData.stock}
              min="0"
              max="9999"
              onChange={e => {
                const val = e.target.value;
                setFormData({...formData, stock: parseInt(val) || 0, total_stock: parseInt(val) || 0});
                setFieldErrors(prev => ({ ...prev, stock: validateStock(val) }));
              }}
            />
            <label htmlFor="stock">Initial Stock</label>
            {fieldErrors.stock && <span className="field-error">{fieldErrors.stock}</span>}
          </div>

          <div className="form-group">
            <label>Select Icon</label>
            <div className="icon-selector">
              {icons.map(i => (
                <div 
                  key={i.id} 
                  className={`icon-option ${formData.icon === i.id ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, icon: i.id})}
                >
                  <span className="material-icons-round">{i.icon}</span>
                  <span>{i.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{width: '100%', marginTop: '1rem'}}>
            Add Medication
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationModal;
