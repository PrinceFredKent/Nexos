import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../config';

const IntelligenceManager = ({ adminEmail }) => {
    const [conditions, setConditions] = useState([]);
    const [insights, setInsights] = useState([]);
    const [activeTab, setActiveTab] = useState('conditions');
    const [isEditing, setIsEditing] = useState(null); // { type, data }
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalTags, setModalTags] = useState([]);
    const [currentTagInput, setCurrentTagInput] = useState('');

    // Controlled form states for medical conditions
    const [formName, setFormName] = useState('');
    const [formIcon, setFormIcon] = useState('medical_services');
    const [formIsEmergency, setFormIsEmergency] = useState(false);
    const [formFemaleOnly, setFormFemaleOnly] = useState(false);
    const [formSymptoms, setFormSymptoms] = useState('');
    const [formRequiredAny, setFormRequiredAny] = useState('');
    const [formExplanation, setFormExplanation] = useState('');
    const [formActionSteps, setFormActionSteps] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
    const [apiKeyMissing, setApiKeyMissing] = useState(false);

    // Controlled form states for insights
    const [formInsightTitle, setFormInsightTitle] = useState('');
    const [formInsightContent, setFormInsightContent] = useState('');
    const [formInsightCategory, setFormInsightCategory] = useState('Insight');
    const [formInsightIcon, setFormInsightIcon] = useState('lightbulb');

    const MEDICAL_ICONS = [
        { id: 'medical_services', name: 'General Medical' },
        { id: 'monitor_heart', name: 'Heart/Cardio' },
        { id: 'vaccines', name: 'Vaccines/Injections' },
        { id: 'coronavirus', name: 'Virus/Infection' },
        { id: 'healing', name: 'Wound/Recovery' },
        { id: 'psychology', name: 'Brain/Mental Health' },
        { id: 'biotech', name: 'Lab/Biotech' },
        { id: 'bloodtype', name: 'Blood/Hematology' },
        { id: 'medication', name: 'Pills/Pharmacy' },
        { id: 'medication_liquid', name: 'Liquid Meds' },
        { id: 'pregnant_woman', name: 'Maternity/OBGYN' },
        { id: 'personal_injury', name: 'Injury/Orthopedic' },
        { id: 'health_and_safety', name: 'Safety/Wellness' },
        { id: 'emergency', name: 'Emergency/Urgent' },
        { id: 'science', name: 'Research/Science' },
        { id: 'masks', name: 'Respiratory/Protection' },
        { id: 'lightbulb', name: 'Insight/Tip' },
        { id: 'restaurant', name: 'Nutrition/Diet' },
        { id: 'fitness_center', name: 'Exercise/Physical' },
        { id: 'bedtime', name: 'Sleep/Rest' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const [condRes, insRes] = await Promise.all([
                fetch(`${API_BASE_URL}/intelligence/conditions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/intelligence/insights`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!condRes.ok || !insRes.ok) throw new Error('Failed to fetch intelligence data');

            const condData = await condRes.json();
            const insData = await insRes.json();

            setConditions(condData);
            setInsights(insData);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCondition = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            explanation: formData.get('explanation'),
            icon: formData.get('icon'),
            is_emergency: formData.get('is_emergency') === 'on',
            female_only: formData.get('female_only') === 'on',
            symptoms: formData.get('symptoms').split(',').map(s => s.trim()).filter(s => s),
            action_steps: formData.get('action_steps').split('\n').map(s => s.trim()).filter(s => s),
            required_any: formData.get('required_any').split(',').map(s => s.trim()).filter(s => s),
            tags: modalTags.join(', ')
        };

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const url = isEditing?.id 
                ? `${API_BASE_URL}/intelligence/conditions/${isEditing.id}`
                : `${API_BASE_URL}/intelligence/conditions`;
            const method = isEditing?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Save failed');
            
            setIsEditing(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleSaveInsight = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            title: formData.get('title'),
            content: formData.get('content'),
            category: formData.get('category'),
            icon: formData.get('icon'),
            tags: modalTags.join(', ')
        };

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const url = isEditing?.id 
                ? `${API_BASE_URL}/intelligence/insights/${isEditing.id}`
                : `${API_BASE_URL}/intelligence/insights`;
            const method = isEditing?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Save failed');
            
            setIsEditing(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Delete this ${type}?`)) return;
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/intelligence/${type}s/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Delete failed');
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const openModal = (type, data = null) => {
        setIsEditing({ type, ...data });
        setApiKeyMissing(false);
        if (type === 'conditions') {
            setFormName(data ? data.name : '');
            setFormIcon(data ? (data.icon || 'medical_services') : 'medical_services');
            setFormIsEmergency(data ? !!data.is_emergency : false);
            setFormFemaleOnly(data ? !!data.female_only : false);
            setFormSymptoms(data && data.symptoms ? JSON.parse(data.symptoms).join(', ') : '');
            setFormRequiredAny(data && data.required_any ? JSON.parse(data.required_any).join(', ') : '');
            setFormExplanation(data ? data.explanation : '');
            setFormActionSteps(data && data.action_steps ? JSON.parse(data.action_steps).join('\n') : '');
        }
        if (type === 'insights') {
            setFormInsightTitle(data ? data.title : '');
            setFormInsightContent(data ? data.content : '');
            setFormInsightCategory(data ? (data.category || 'Insight') : 'Insight');
            setFormInsightIcon(data ? (data.icon || 'lightbulb') : 'lightbulb');
        }
        if (data && data.tags) {
            setModalTags(data.tags.split(',').map(t => t.trim()).filter(t => t));
        } else {
            setModalTags([]);
        }
    };

    const handleAiGenerate = async () => {
        if (!formName.trim()) return;
        setIsGenerating(true);
        setApiKeyMissing(false);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/intelligence/conditions/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: formName })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (errData.detail && errData.detail.includes("GEMINI_API_KEY")) {
                    setApiKeyMissing(true);
                    throw new Error(errData.detail);
                }
                throw new Error(errData.detail || 'Failed to auto-generate condition data');
            }

            const data = await res.json();
            
            // Auto-fill controlled form states
            if (data.name) setFormName(data.name);
            if (data.icon) setFormIcon(data.icon);
            if (data.is_emergency !== undefined) setFormIsEmergency(data.is_emergency);
            if (data.female_only !== undefined) setFormFemaleOnly(data.female_only);
            if (data.symptoms) setFormSymptoms(Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms);
            if (data.required_any) setFormRequiredAny(Array.isArray(data.required_any) ? data.required_any.join(', ') : data.required_any);
            if (data.explanation) setFormExplanation(data.explanation);
            if (data.action_steps) setFormActionSteps(Array.isArray(data.action_steps) ? data.action_steps.join('\n') : data.action_steps);
            if (data.tags) {
                setModalTags(data.tags.split(',').map(t => t.trim()).filter(t => t));
            }
        } catch (err) {
            console.error("AI Generation failed:", err);
            if (!apiKeyMissing) {
                alert(err.message);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAiGenerateInsight = async () => {
        if (!formInsightTitle.trim()) return;
        setIsGeneratingInsight(true);
        setApiKeyMissing(false);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/intelligence/insights/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: formInsightTitle })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (errData.detail && errData.detail.includes("GEMINI_API_KEY")) {
                    setApiKeyMissing(true);
                    throw new Error(errData.detail);
                }
                throw new Error(errData.detail || 'Failed to auto-generate insight data');
            }

            const data = await res.json();

            if (data.title) setFormInsightTitle(data.title);
            if (data.content) setFormInsightContent(data.content);
            if (data.category) setFormInsightCategory(data.category);
            if (data.icon) setFormInsightIcon(data.icon);
            if (data.tags) {
                setModalTags(data.tags.split(',').map(t => t.trim()).filter(t => t));
            }
        } catch (err) {
            console.error("AI Insight Generation failed:", err);
            if (!apiKeyMissing) {
                alert(err.message);
            }
        } finally {
            setIsGeneratingInsight(false);
        }
    };

    const addTag = () => {
        const tag = currentTagInput.trim();
        if (tag && !modalTags.includes(tag)) {
            setModalTags([...modalTags, tag]);
            setCurrentTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setModalTags(modalTags.filter(t => t !== tagToRemove));
    };

    if (isLoading) return <div className="p-8 text-center">Loading Intelligence Engine...</div>;

    return (
        <div className="intelligence-manager fade-in">
            <header className="manager-header">
                <div>
                    <h1>Intelligence Manager</h1>
                    <p className="text-muted">Personalize and improve the app's diagnostic brain.</p>
                </div>
                <div className="tab-switcher">
                    <button className={activeTab === 'conditions' ? 'active' : ''} onClick={() => setActiveTab('conditions')}>Conditions</button>
                    <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>Insights & Tips</button>
                </div>
            </header>

            <main className="manager-content">
                <div className="section-header">
                    <h2>{activeTab === 'conditions' ? 'Medical Conditions' : 'Health Insights'}</h2>
                    <button className="btn-primary-mini" onClick={() => openModal(activeTab)}>
                        <span className="material-icons-round">add</span> Add New
                    </button>
                </div>

                <div className="grid-list">
                    {activeTab === 'conditions' ? (
                        conditions.map(c => (
                            <div key={c.id} className="manager-card glass-card">
                                <div className="card-top">
                                    <span className="material-icons-round card-icon">{c.icon}</span>
                                    <div className="card-actions">
                                        <button onClick={() => openModal('conditions', c)}><span className="material-icons-round">edit</span></button>
                                        <button onClick={() => handleDelete('condition', c.id)} className="delete"><span className="material-icons-round">delete</span></button>
                                    </div>
                                </div>
                                <h3>{c.name}</h3>
                                <p className="card-summary">{c.explanation.substring(0, 80)}...</p>
                                <div className="card-tags">
                                    {c.is_emergency && <span className="tag emergency">Emergency</span>}
                                    {c.female_only && <span className="tag female">Female Only</span>}
                                    <span className="tag symptoms">{JSON.parse(c.symptoms).length} Symptoms</span>
                                    {c.tags && c.tags.split(',').map(tag => (
                                        <span key={tag} className="tag generic">{tag.trim()}</span>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        insights.map(i => (
                            <div key={i.id} className="manager-card glass-card">
                                <div className="card-top">
                                    <span className="material-icons-round card-icon">{i.icon}</span>
                                    <div className="card-actions">
                                        <button onClick={() => openModal('insights', i)}><span className="material-icons-round">edit</span></button>
                                        <button onClick={() => handleDelete('insight', i.id)} className="delete"><span className="material-icons-round">delete</span></button>
                                    </div>
                                </div>
                                <div className="category-badge">{i.category}</div>
                                <h3>{i.title}</h3>
                                <p className="card-summary">{i.content.substring(0, 100)}...</p>
                                <div className="card-tags">
                                    {i.tags && i.tags.split(',').map(tag => (
                                        <span key={tag} className="tag generic">{tag.trim()}</span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Edit Modal */}
            {isEditing && createPortal(
                <div className="modal-overlay" onClick={() => setIsEditing(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-inner-header">
                            <h2>{isEditing.id ? 'Edit' : 'Add'} {isEditing.type === 'conditions' ? 'Condition' : 'Insight'}</h2>
                            <button className="close-btn" onClick={() => setIsEditing(null)}><span className="material-icons-round">close</span></button>
                        </div>
                        
                        <form onSubmit={isEditing.type === 'conditions' ? handleSaveCondition : handleSaveInsight} className="manager-form">
                            {isEditing.type === 'conditions' ? (
                                <>
                                    <div className="form-section">
                                        <div className="form-section-title">Identity & Role</div>
                                        {apiKeyMissing && (
                                            <div className="alert-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '16px', color: '#ff6b6b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                                <span className="material-icons-round">warning</span>
                                                <span><strong>GEMINI_API_KEY is not configured:</strong> Please add `GEMINI_API_KEY="your_api_key"` to your backend <code>.env</code> file and restart the backend server to enable AI autocomplete.</span>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label><span className="material-icons-round">label</span> Condition Name</label>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <input 
                                                    name="name" 
                                                    value={formName} 
                                                    onChange={(e) => setFormName(e.target.value)} 
                                                    required 
                                                    placeholder="e.g. Malaria" 
                                                    style={{ flex: 1 }}
                                                />
                                                <button 
                                                    type="button" 
                                                    className="btn-primary-mini" 
                                                    onClick={handleAiGenerate}
                                                    disabled={isGenerating || !formName.trim()}
                                                    style={{ 
                                                        minWidth: '160px', 
                                                        height: '56px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center', 
                                                        gap: '8px', 
                                                        background: 'var(--primary)', 
                                                        color: 'white',
                                                        borderRadius: '18px',
                                                        border: 'none',
                                                        fontWeight: '800',
                                                        cursor: formName.trim() ? 'pointer' : 'not-allowed',
                                                        opacity: formName.trim() ? 1 : 0.6,
                                                        boxShadow: '0 4px 15px var(--primary-glow)',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <span className="material-icons-round spin">sync</span>
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons-round">search</span>
                                                            Search
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label><span className="material-icons-round">category</span> Clinical Icon</label>
                                                <select name="icon" value={formIcon} onChange={(e) => setFormIcon(e.target.value)}>
                                                    {MEDICAL_ICONS.map(icon => (
                                                        <option key={icon.id} value={icon.id}>{icon.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label><span className="material-icons-round">tune</span> Flags</label>
                                                <div className="checkbox-card-group">
                                                    <label className={`checkbox-card ${formIsEmergency ? 'active' : ''}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            name="is_emergency" 
                                                            checked={formIsEmergency} 
                                                            onChange={(e) => setFormIsEmergency(e.target.checked)} 
                                                        />
                                                        <span>Emergency?</span>
                                                    </label>
                                                    <label className={`checkbox-card ${formFemaleOnly ? 'active' : ''}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            name="female_only" 
                                                            checked={formFemaleOnly} 
                                                            onChange={(e) => setFormFemaleOnly(e.target.checked)} 
                                                        />
                                                        <span>Female Only?</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-title">Diagnostic Logic</div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">checklist</span> Symptoms (comma separated)</label>
                                            <input 
                                                name="symptoms" 
                                                value={formSymptoms} 
                                                onChange={(e) => setFormSymptoms(e.target.value)} 
                                                placeholder="Fever, Chills, Headache..." 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">priority_high</span> Core Indicators (required symbols)</label>
                                            <input 
                                                name="required_any" 
                                                value={formRequiredAny} 
                                                onChange={(e) => setFormRequiredAny(e.target.value)} 
                                                placeholder="Fever, Chills..." 
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-title">Clinical Guidance</div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">description</span> Patient-Facing Explanation</label>
                                            <textarea 
                                                name="explanation" 
                                                value={formExplanation} 
                                                onChange={(e) => setFormExplanation(e.target.value)} 
                                                required 
                                                rows="3" 
                                                placeholder="Provide a professional overview of the condition..."
                                            ></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">list_alt</span> Treatment/Action Steps (one per line)</label>
                                            <textarea 
                                                name="action_steps" 
                                                value={formActionSteps} 
                                                onChange={(e) => setFormActionSteps(e.target.value)} 
                                                rows="4" 
                                                placeholder="Visit lab for tests...&#10;Consult a physician immediately...&#10;Stay hydrated..."
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-title">Connectivity</div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">sell</span> Contribution Tags</label>
                                            <div className="chip-input-container">
                                                <div className="chips-wrapper">
                                                    {modalTags.map(tag => (
                                                        <span key={tag} className="chip">
                                                            {tag}
                                                            <span className="material-icons-round remove-chip" onClick={() => removeTag(tag)}>close</span>
                                                        </span>
                                                    ))}
                                                    <input 
                                                        value={currentTagInput}
                                                        onChange={(e) => setCurrentTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addTag();
                                                            }
                                                        }}
                                                        placeholder={modalTags.length === 0 ? "e.g. Malaria, Anemia..." : "Add more..."}
                                                        className="chip-bare-input"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-section">
                                        <div className="form-section-title">Content Details</div>
                                        {apiKeyMissing && (
                                            <div className="alert-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '16px', color: '#ff6b6b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                                <span className="material-icons-round">warning</span>
                                                <span><strong>GEMINI_API_KEY is not configured:</strong> Please add <code>GEMINI_API_KEY="your_api_key"</code> to your backend <code>.env</code> file and restart the backend server to enable AI autocomplete.</span>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label><span className="material-icons-round">title</span> Insight Title</label>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <input
                                                    name="title"
                                                    value={formInsightTitle}
                                                    onChange={(e) => setFormInsightTitle(e.target.value)}
                                                    required
                                                    placeholder="e.g. How to Sleep Better"
                                                    style={{ flex: 1 }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-primary-mini"
                                                    onClick={handleAiGenerateInsight}
                                                    disabled={isGeneratingInsight || !formInsightTitle.trim()}
                                                    style={{
                                                        minWidth: '160px',
                                                        height: '56px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        borderRadius: '18px',
                                                        border: 'none',
                                                        fontWeight: '800',
                                                        cursor: formInsightTitle.trim() ? 'pointer' : 'not-allowed',
                                                        opacity: formInsightTitle.trim() ? 1 : 0.6,
                                                        boxShadow: '0 4px 15px var(--primary-glow)',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    {isGeneratingInsight ? (
                                                        <>
                                                            <span className="material-icons-round spin">sync</span>
                                                            Generating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons-round">search</span>
                                                            Search
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label><span className="material-icons-round">sell</span> Category</label>
                                                <select
                                                    name="category"
                                                    value={formInsightCategory}
                                                    onChange={(e) => setFormInsightCategory(e.target.value)}
                                                >
                                                    <option>Insight</option>
                                                    <option>Tip</option>
                                                    <option>Warning</option>
                                                    <option>Nutrition</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label><span className="material-icons-round">face</span> Visual Icon</label>
                                                <select
                                                    name="icon"
                                                    value={formInsightIcon}
                                                    onChange={(e) => setFormInsightIcon(e.target.value)}
                                                >
                                                    {MEDICAL_ICONS.map(icon => (
                                                        <option key={icon.id} value={icon.id}>{icon.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-title">Rich Content</div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">subject</span> Body Content</label>
                                            <textarea
                                                name="content"
                                                value={formInsightContent}
                                                onChange={(e) => setFormInsightContent(e.target.value)}
                                                required
                                                rows="8"
                                                placeholder="Enter the full content of the health insight or tip..."
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-title">Connectivity</div>
                                        <div className="form-group">
                                            <label><span className="material-icons-round">sell</span> Contribution Tags</label>
                                            <div className="chip-input-container">
                                                <div className="chips-wrapper">
                                                    {modalTags.map(tag => (
                                                        <span key={tag} className="chip">
                                                            {tag}
                                                            <span className="material-icons-round remove-chip" onClick={() => removeTag(tag)}>close</span>
                                                        </span>
                                                    ))}
                                                    <input
                                                        value={currentTagInput}
                                                        onChange={(e) => setCurrentTagInput(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addTag();
                                                            }
                                                        }}
                                                        placeholder={modalTags.length === 0 ? "e.g. Sleep, Nutrition..." : "Add more..."}
                                                        className="chip-bare-input"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsEditing(null)}>Discard</button>
                                <button type="submit" className="btn-save">Save {isEditing.type === 'conditions' ? 'Condition' : 'Insight'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1.5s linear infinite;
                    display: inline-block;
                }
                .intelligence-manager { 
                    padding: 0 1.5rem 3rem 1.5rem; 
                    max-width: 1300px; 
                    margin: 0 auto; 
                    min-height: 80vh; 
                    width: 100%;
                }
                .manager-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 3rem; 
                    border-bottom: 1px solid var(--border); 
                    padding: 2rem 0;
                }
                .manager-header h1 {
                    font-size: 2.5rem;
                    margin: 0;
                    background: linear-gradient(135deg, var(--text-main), var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: 800;
                    letter-spacing: -1px;
                }
                .tab-switcher { display: flex; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 16px; backdrop-filter: blur(15px); border: 1px solid var(--border-light); }
                .tab-switcher button { padding: 0.8rem 1.6rem; border: none; background: none; border-radius: 12px; cursor: pointer; color: var(--text-muted); font-weight: 700; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .tab-switcher button.active { background: var(--primary); color: white; box-shadow: 0 8px 20px rgba(67, 97, 238, 0.4); transform: scale(1.05); }
                
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; }
                
                .manager-card { 
                    padding: 2rem; 
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    display: flex; 
                    flex-direction: column; 
                    gap: 1.2rem; 
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
                    box-shadow: var(--shadow-md);
                }
                .manager-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
                .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
                .card-icon { font-size: 2.5rem; color: var(--primary); background: var(--primary-light); padding: 0.8rem; border-radius: 18px; }
                .card-actions { display: flex; gap: 0.8rem; opacity: 0; transition: all 0.3s; }
                .manager-card:hover .card-actions { opacity: 1; }
                .card-actions button { background: var(--bg-main); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; color: var(--text-muted); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .card-actions button:hover { color: var(--primary); border-color: var(--primary); transform: scale(1.1); }
                .card-actions button.delete:hover { color: #ef4444; border-color: #ef4444; }
                
                .card-summary { font-size: 0.95rem; color: var(--text-muted); line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                .card-tags { display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: auto; padding-top: 1.2rem; border-top: 1px dashed var(--border); }
                .tag { font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; }
                .tag.emergency { background: rgba(239, 68, 68, 0.1); color: #ff6b6b; border: 1px solid rgba(239, 68, 68, 0.2); }
                .tag.female { background: rgba(236, 72, 153, 0.1); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.2); }
                .tag.symptoms { background: rgba(67, 97, 238, 0.1); color: #60a5fa; border: 1px solid rgba(67, 97, 238, 0.2); }
                .tag.generic { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border); }

                /* Chip Input Styles */
                .chip-input-container {
                    background: var(--bg-input);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    padding: 0.6rem 1rem;
                    min-height: 56px;
                    transition: all 0.3s;
                }
                .chip-input-container:focus-within {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px var(--primary-glow);
                }
                .chips-wrapper {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.6rem;
                    align-items: center;
                }
                .chip {
                    background: var(--primary);
                    color: white;
                    padding: 4px 10px 4px 14px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    animation: chipScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes chipScaleIn {
                    from { transform: scale(0.5); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .remove-chip {
                    font-size: 1rem;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                .remove-chip:hover { opacity: 1; }
                .chip-bare-input {
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    width: auto !important;
                    flex: 1;
                    min-width: 120px;
                    padding: 0.4rem 0 !important;
                    font-size: 1rem !important;
                }
                
                .category-badge { font-size: 0.75rem; color: var(--primary); font-weight: 900; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
                
                .modal-overlay { 
                    position: fixed !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100vw !important; 
                    height: 100vh !important; 
                    background: rgba(10, 15, 28, 0.85); 
                    backdrop-filter: blur(20px) saturate(180%); 
                    display: flex !important; 
                    align-items: center !important; 
                    justify-content: center !important; 
                    z-index: 9999999 !important; 
                    padding: 2rem;
                }
                .modal-content { 
                    max-width: 850px; 
                    width: 100%; 
                    max-height: 90vh; 
                    overflow-y: auto; 
                    background: var(--bg-card);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 32px;
                    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
                    position: relative;
                    animation: modalScaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex;
                    flex-direction: column;
                }
                @keyframes modalScaleUp {
                    from { transform: scale(0.9) translateY(40px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                
                .modal-inner-header { 
                    padding: 2.5rem 3rem 1.5rem; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    border-bottom: 1px solid var(--border); 
                    position: sticky;
                    top: 0;
                    background: var(--bg-card);
                    z-index: 10;
                    backdrop-filter: blur(10px);
                }
                .modal-inner-header h2 { font-size: 2rem; margin: 0; color: white; font-weight: 800; letter-spacing: -0.5px; }
                
                .close-btn { 
                    width: 44px; 
                    height: 44px; 
                    border-radius: 50%; 
                    border: 1px solid var(--border); 
                    background: rgba(255,255,255,0.05); 
                    color: white; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    transition: all 0.3s;
                }
                .close-btn:hover { background: #ef4444; border-color: #ef4444; transform: rotate(90deg); }
                
                .manager-form { padding: 2rem 3rem 3rem; display: flex; flex-direction: column; gap: 2rem; }
                
                .form-section { display: flex; flex-direction: column; gap: 1.5rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--border-light); }
                .form-section-title { font-size: 0.85rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: -0.5rem; }
                
                .form-group { display: flex; flex-direction: column; gap: 0.8rem; }
                .form-group label { font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 0.5rem; }
                .form-group label .material-icons-round { font-size: 1.1rem; color: var(--primary); opacity: 0.7; }
                
                .manager-form input, .manager-form textarea, .manager-form select { 
                    padding: 1.2rem 1.4rem; 
                    background: var(--bg-input); 
                    border: 1px solid var(--border); 
                    border-radius: 18px; 
                    color: white; 
                    font-size: 1.05rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 100%;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                }
                .manager-form input:focus, .manager-form textarea:focus { border-color: var(--primary); outline: none; background: rgba(255,255,255,0.08); box-shadow: 0 0 0 4px var(--primary-glow), inset 0 2px 4px rgba(0,0,0,0.2); }
                
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                
                .checkbox-card-group { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .checkbox-card { 
                    background: var(--bg-input); 
                    border: 1px solid var(--border); 
                    border-radius: 16px; 
                    padding: 1rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 1rem; 
                    cursor: pointer; 
                    transition: all 0.3s;
                }
                .checkbox-card:hover { border-color: var(--primary); background: var(--primary-light); }
                .checkbox-card.active { border-color: var(--primary); background: var(--primary-glow); }
                .checkbox-card input[type="checkbox"] { width: 22px; height: 22px; cursor: pointer; accent-color: var(--primary); }
                .checkbox-card span { font-size: 0.9rem; font-weight: 600; }
                
                .form-actions { 
                    position: sticky;
                    bottom: 0;
                    background: var(--bg-card);
                    padding: 1.5rem 3rem 2.5rem; 
                    display: flex; 
                    justify-content: flex-end; 
                    gap: 1.5rem; 
                    border-top: 1px solid var(--border); 
                    z-index: 10;
                    backdrop-filter: blur(10px);
                }
                .btn-save { background: var(--primary); color: white; padding: 1.2rem 3rem; border: none; border-radius: 18px; font-weight: 800; cursor: pointer; font-size: 1.1rem; box-shadow: 0 10px 25px var(--primary-glow); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .btn-save:hover { transform: translateY(-4px); box-shadow: 0 15px 35px var(--primary-glow); filter: brightness(1.1); }
                .btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-muted); padding: 1.2rem 2.5rem; border-radius: 18px; font-weight: 700; cursor: pointer; transition: all 0.3s; }
                .btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; border-color: white; }

                /* Custom Scrollbar for Modal */
                .modal-content::-webkit-scrollbar { width: 6px; }
                .modal-content::-webkit-scrollbar-track { background: transparent; }
                .modal-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                .modal-content:hover::-webkit-scrollbar-thumb { background: var(--text-muted); }
            `}</style>
        </div>
    );
};

export default IntelligenceManager;
