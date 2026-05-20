import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import PlannerPage from './pages/PlannerPage';
import MedicationsPage from './pages/MedicationsPage';
import { API_BASE_URL } from './config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './styles/main.css';
import Login from './components/Login';
import Signup from './components/Signup';
import WelcomeScreen from './components/WelcomeScreen';
import AddMedicationModal from './components/AddMedicationModal';
import Profile from './components/Profile';
import Settings from './components/Settings';
import CycleTracker from './components/CycleTracker';
import Emergency from './components/Emergency';
import IntelligenceManager from './components/IntelligenceManager';
import Dashboard from './components/Dashboard';
import VerifyAccount from './components/VerifyAccount';
import ForgotPassword from './components/ForgotPassword';
// import DoctorDashboard from './components/DoctorDashboard'; // Removed

const COMMON_SYMPTOMS = [
  'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Aching', 
  'Dizziness', 'Sore Throat', 'Chest Pain', 'Shortness of Breath', 
  'Muscle Pain', 'Chills', 'Loss of Taste', 'Congestion',
  'Sweating', 'Body Aches', 'Weakness', 'Loss of Appetite',
  'Abdominal Pain', 'Diarrhea', 'Persistent Cough', 'Weight Loss',
  'Blurred Vision', 'Shortness of Breath', 'Difficulty Breathing',
  'Wheezing', 'Chest Tightness', 'Abdominal Cramps', 'Severe Headache',
  'Sudden Weakness', 'Slurred Speech', 'Confusion', 'Vision Problems',
  'Frequent Urination', 'Excess Thirst', 'Restlessness', 'Rapid Heartbeat',
  'Persistent Sadness', 'Loss of Interest'
];

const AnalysisLoading = () => (
  <div className="analysis-loading-card fade-in">
    <div className="loading-icon-wrapper">
      <div className="loading-halo"></div>
      <div className="scan-box">
        <div className="scan-laser"></div>
      </div>
      <span className="material-icons-round main-loading-icon">monitor_heart</span>
    </div>
    <div className="loading-text-content">
      <h2>Processing Symptoms</h2>
      <p>Our AI is analyzing your health data...</p>
    </div>
    <div className="loading-steps">
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
    </div>
  </div>
);

function App() {

  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo(0, 0);
    }
  }, [location.pathname]);
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const setActiveTab = (tab) => {
    const map = { symptoms: 'dashboard', meds: 'medications', cycle: 'cycle-tracker' };
    navigate('/' + (map[tab] || tab));
  };
  const [theme, setTheme] = useState(localStorage.getItem('nexos_theme') || 'system');
  const [isAuthenticated, setIsAuthenticated] = useState(!!(localStorage.getItem('token') || sessionStorage.getItem('token')));
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('token') && !sessionStorage.getItem('token') && window.innerWidth < 1025);
  const [userRole, setUserRole] = useState('patient'); // Always patient now
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [availableChips, setAvailableChips] = useState([
    'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Aching', 
    'Dizziness', 'Sore Throat', 'Chest Pain', 'Shortness of Breath',
    'Weakness', 'Sweating', 'Abdominal Pain', 'Congestion'
  ]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isCheckerCollapsed, setIsCheckerCollapsed] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [patient, setPatient] = useState(null);
  const [meds, setMeds] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [historyMed, setHistoryMed] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isAnalysisHistoryModalOpen, setIsAnalysisHistoryModalOpen] = useState(false);
  const [analysisHistoryRecords, setAnalysisHistoryRecords] = useState([]);
  const [cycleLogs, setCycleLogs] = useState([]);
  const [cycleContext, setCycleContext] = useState(null);
  const [showEmergencyCountdown, setShowEmergencyCountdown] = useState(false);
  const [countdownTimer, setCountdownTimer] = useState(5);
  const [isEmergencyProtocolEngaged, setIsEmergencyProtocolEngaged] = useState(false);
  const [userEvents, setUserEvents] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventDate, setSelectedEventDate] = useState(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', type: 'Appointment' });
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventTime, setEventTime] = useState('10:00');

  // Long-press state for Emergency SOS button
  const [isHoldingEmergency, setIsHoldingEmergency] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const isLongPressRef = useRef(false);
  
  // Header Functionality State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('nexos_search_history');
    return saved ? JSON.parse(saved) : ['Dashboard', 'Medications', 'Planner', 'Profile'];
  });

  const addToHistory = (term) => {
    if (!term || term.trim() === '') return;
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('nexos_search_history', JSON.stringify(newHistory));
  };
  const [activeDropdown, setActiveDropdown] = useState(null); // 'search', 'notifications', 'actions', 'mobileMenu'
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'info', title: 'Welcome to Nexos', text: 'All systems are active. Stay healthy!', read: false },
    { id: 2, type: 'reminder', title: 'Medication Schedule', text: 'Your Morning dose of multivitamin is coming up.', read: false }
  ]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [closingDropdown, setClosingDropdown] = useState(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);

  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [isPlannerTypeExpanded, setIsPlannerTypeExpanded] = useState(false);

  // ── Sync state ────────────────────────────────────────────────────────────
  const [syncProgress, setSyncProgress] = useState(0);   // 0-100 during initial pull
  const [syncStatusMsg, setSyncStatusMsg] = useState('');   // toast label
  const [showSyncToast, setShowSyncToast] = useState(false); // show progressive toast
  const [syncLastAt, setSyncLastAt] = useState(null);        // ISO string of last sync
  const [syncCloudOk, setSyncCloudOk] = useState(null);      // null=unknown, true/false
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [showMobileTour, setShowMobileTour] = useState(false);
  const [tourStep, setTourStep] = useState(1);
  
  const [intelligenceData, setIntelligenceData] = useState({ conditions: [], insights: [] });
  const [adminEmail, setAdminEmail] = useState(null);

  // Dropdown Refs for Click-Outside logic
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const actionsRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Transition Handlers
  const closeDropdown = () => {
    if (!activeDropdown) return;
    setClosingDropdown(activeDropdown);
    setTimeout(() => {
        setActiveDropdown(null);
        setClosingDropdown(null);
    }, 280);
  };

  const toggleDropdown = (type) => {
    if (activeDropdown === type) {
        closeDropdown();
    } else {
        setActiveDropdown(type);
        if (type === 'notifications') {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    }
  };

  const closeDetail = () => {
    if (!selectedDetail) return;
    setIsClosingDetail(true);
    setTimeout(() => {
        setSelectedDetail(null);
        setIsClosingDetail(false);
    }, 280);
  };

  const handleDownloadAnalysisHistory = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // ── Premium Header ──
    doc.setFillColor(67, 97, 238);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Subtle Icon/Logo Circle
    doc.setFillColor(255, 255, 255, 0.1);
    doc.circle(25, 22, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('N', 23, 24);

    doc.setFontSize(22);
    doc.text('AI Health Analysis History', 42, 24);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(200, 210, 255);
    doc.text(`Comprehensive Symptom Assessment Records • ${new Date().toLocaleDateString()}`, 42, 31);
    
    let currentY = 60;
    
    analysisHistoryRecords.forEach((record, index) => {
        // Page break if near bottom
        if (currentY > 230) {
            doc.addPage();
            currentY = 30;
        }
        
        const dateStr = new Date(record.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        
        // Record Header (Condition Name)
        doc.setFontSize(15);
        doc.setTextColor(67, 97, 238);
        doc.setFont(undefined, 'bold');
        doc.text(record.top_condition || "Health Assessment", 14, currentY);
        
        doc.setFontSize(9);
        doc.setTextColor(140);
        doc.setFont(undefined, 'normal');
        doc.text(dateStr, pageWidth - 14, currentY, { align: 'right' });
        
        // Risk Badge (Improved)
        const riskLevel = record.risk_level || 'Medium';
        const riskColor = riskLevel === 'High' ? [239, 68, 68] : riskLevel === 'Low' ? [34, 197, 94] : [245, 158, 11];
        
        doc.setFillColor(...riskColor);
        doc.roundedRect(14, currentY + 4, 28, 6, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text(`${riskLevel} Risk`, 16, currentY + 8.2);
        
        currentY += 16;
        
        // Data Section (Symptoms & Analysis)
        autoTable(doc, {
            startY: currentY,
            body: [
                ['Reported Symptoms', record.symptoms?.join(', ') || 'N/A'],
                ['Clinical Analysis', record.explanation || 'N/A']
            ],
            theme: 'plain',
            styles: { 
                fontSize: 9, 
                cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
                overflow: 'linebreak',
                lineColor: [240, 240, 240],
                lineWidth: 0.1
            },
            columnStyles: { 
                0: { fontStyle: 'bold', width: 40, textColor: [100, 100, 100] },
                1: { textColor: [50, 50, 50], lineHeight: 1.4 }
            },
            margin: { left: 14, right: 14 }
        });
        
        currentY = doc.lastAutoTable.finalY + 18;
        
        // Separator (Subtle)
        if (index < analysisHistoryRecords.length - 1) {
            doc.setDrawColor(245);
            doc.setLineWidth(0.5);
            doc.line(14, currentY - 10, pageWidth - 14, currentY - 10);
        }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180);
        doc.setDrawColor(240);
        doc.line(14, 282, pageWidth - 14, 282);
        doc.text(`Page ${i} of ${pageCount} — Nexos AI Health History (Official Document)`, 14, 288);
        doc.text(`Nexos Healthcare Systems • Secure Document`, pageWidth - 14, 288, { align: 'right' });
    }
    
    doc.save(`Nexos_AI_Analysis_History_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Click-Outside Dismissal Effect
  useEffect(() => {
    const handleClickOutside = (event) => {
        const isClickInSearch = searchRef.current && searchRef.current.contains(event.target);
        const isClickInNotif = notificationsRef.current && notificationsRef.current.contains(event.target);
        const isClickInActions = actionsRef.current && actionsRef.current.contains(event.target);
        const isClickInMobileMenu = mobileMenuRef.current && mobileMenuRef.current.contains(event.target);
        
        if (!isClickInSearch && !isClickInNotif && !isClickInActions && !isClickInMobileMenu) {
            closeDropdown();
            setIsMobileSearchExpanded(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // Bypass Welcome Screen and Mobile Tour on Desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1025) {
        if (showWelcome) setShowWelcome(false);
        if (showMobileTour) setShowMobileTour(false);
      }
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showWelcome, showMobileTour]);

  // Focus search input when expanded on mobile
  useEffect(() => {
    if (isMobileSearchExpanded && searchInputRef.current) {
        setTimeout(() => {
            searchInputRef.current.focus();
        }, 150);
    }
  }, [isMobileSearchExpanded]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Global Theme Effect
  React.useEffect(() => {
    const applyTheme = (t) => {
      let active = t;
      if (t === 'system') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      if (active === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    };

    applyTheme(theme);
    localStorage.setItem('nexos_theme', theme);

    // Listener for system appearance changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = e => {
      if (theme === 'system') applyTheme('system');
    };
    
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [theme]);

  // Auto-hide greeting
  React.useEffect(() => {
    if (isAuthenticated) {
        const timer = setTimeout(() => {
            setShowGreeting(false);
        }, 9000);
        return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Emergency Countdown Effect
  useEffect(() => {
    let interval = null;
    if (showEmergencyCountdown && countdownTimer > 0) {
        interval = setInterval(() => {
            setCountdownTimer(prev => prev - 1);
        }, 1000);
    } else if (showEmergencyCountdown && countdownTimer === 0) {
        // Time's up, auto-engage
        handleProceedEmergency();
    }
    return () => clearInterval(interval);
  }, [showEmergencyCountdown, countdownTimer]);

  const handleProceedEmergency = () => {
      setShowEmergencyCountdown(false);
      setIsEmergencyProtocolEngaged(true);
      setActiveTab('emergency');
  };

  const cancelEmergency = () => {
      setShowEmergencyCountdown(false);
      setCountdownTimer(5);
  };

  // Cleanup holding timers on component unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const startEmergencyHold = (e) => {
    e.preventDefault();
    isLongPressRef.current = false;
    setIsHoldingEmergency(true);
    setHoldProgress(0);
    
    const duration = 1500; // 1.5 seconds hold time
    const intervalTime = 30; // update progress every 30ms
    let currentProgress = 0;
    
    progressIntervalRef.current = setInterval(() => {
      currentProgress += (intervalTime / duration) * 100;
      if (currentProgress >= 100) {
        setHoldProgress(100);
        clearInterval(progressIntervalRef.current);
      } else {
        setHoldProgress(currentProgress);
      }
    }, intervalTime);
    
    holdTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Premium haptic vibe
      }
      isLongPressRef.current = true;
      setIsHoldingEmergency(false);
      setHoldProgress(0);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      setCountdownTimer(5);
      setShowEmergencyCountdown(true);
    }, duration);
  };

  const cancelEmergencyHold = (e) => {
    if (isHoldingEmergency) {
      setIsHoldingEmergency(false);
      setHoldProgress(0);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      // If released before 1.5s, treat as a standard quick tap
      if (!isLongPressRef.current) {
        setActiveTab('emergency');
      }
    }
  };

  const fetchPatientData = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    return fetch(`${API_BASE_URL}/patient-info`, { headers })
        .then(res => {
            if (!res.ok) throw new Error('Unauthorized');
            return res.json();
        })
        .then(patientData => {
            setPatient(patientData);
            if (patientData.email) setAdminEmail(patientData.email);
            
            // Safety: Check if essential vitals are missing (e.g., from an old account or partial Google signup)
            // We no longer force users into the completion wizard on page load; they can now access the dashboard
            // freely and complete their details via the interactive reminder banner at their own pace.

            // All secondary fetches run in parallel
            fetchMeds();
            fetchEvents();
            if (patientData?.gender?.toLowerCase() === 'female') {
                fetchCycleLogs();
            }
        })
        .catch(err => {
            console.error('Auth error:', err);
            handleLogout();
        });
  };

  // Fetch patient data on load
  React.useEffect(() => {
    if (isAuthenticated) {
        fetchPatientData();
        const tourCompleted = localStorage.getItem('nexos_mobile_tour_completed');
        if (!tourCompleted && window.innerWidth < 1025) {
            setShowMobileTour(true);
            setTourStep(1);
        }
    }
  }, [isAuthenticated]);

  const fetchMeds = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return Promise.resolve();
    return fetch(`${API_BASE_URL}/medications`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (Array.isArray(data)) {
            setMeds(data);
        } else {
            console.error('Fetch meds error: Expected array but got', data);
            // Optionally set to empty array to recover from crash state
            setMeds([]);
        }
    })
    .catch(err => console.error('Fetch meds error:', err));
  };

  const fetchCycleLogs = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return Promise.resolve();
    return fetch(`${API_BASE_URL}/cycle-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      const logs = Array.isArray(data) ? data : [];
      setCycleLogs(logs);
      // Compute cycle context string for symptom AI
      if (logs.length > 0) {
        const sorted = [...logs].sort((a, b) => new Date(b.period_start) - new Date(a.period_start));
        const latest = sorted[0];
        const today = new Date(); today.setHours(0,0,0,0);
        const start = new Date(latest.period_start);
        const dayOfCycle = Math.round((today - start) / (1000*60*60*24)) + 1;
        const cl = latest.cycle_length || 28;
        const periodDur = latest.period_end
          ? Math.round((new Date(latest.period_end) - start) / (1000*60*60*24)) + 1
          : 5;
        let phase = 'Luteal';
        if (dayOfCycle <= periodDur) phase = 'Menstruation';
        else if (dayOfCycle <= 13) phase = 'Follicular';
        else if (dayOfCycle <= 15) phase = 'Ovulation';
        setCycleContext(`Patient is on Day ${dayOfCycle} of a ${cl}-day cycle (${phase} phase). Last period started ${latest.period_start}.`);
      } else {
        setCycleContext(null);
      }
    })
    .catch(err => console.error("Cycle logs error:", err));
  };

  const fetchEvents = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return Promise.resolve();
    return fetch(`${API_BASE_URL}/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setUserEvents(Array.isArray(data) ? data : []))
    .catch(err => console.error('Fetch events error:', err));
  };

  const handleAddEvent = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const eventData = {
      ...newEvent,
      appointment_date: `${selectedEventDate}T${eventTime}:00`
    };

    const url = isEditingEvent ? `${API_BASE_URL}/events/${editingEventId}` : `${API_BASE_URL}/events`;
    const method = isEditingEvent ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData)
    })
    .then(res => res.json())
    .then(() => {
      fetchEvents();
      setIsEventModalOpen(false);
      setIsEditingEvent(false);
      setEditingEventId(null);
      setNewEvent({ title: '', description: '', location: '', type: 'Appointment' });
      setEventTime('10:00');
    })
    .catch(err => console.error(`${isEditingEvent ? "Update" : "Add"} event error:`, err));
  };

  const handleEditEvent = (event) => {
    const dateStr = event.appointment_date ? event.appointment_date.split('T')[0] : '';
    const timeStr = event.appointment_date ? event.appointment_date.split('T')[1].substring(0, 5) : '10:00';
    
    setNewEvent({
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      type: event.type || 'Appointment'
    });
    setSelectedEventDate(dateStr);
    setEventTime(timeStr);
    setEditingEventId(event.id);
    setIsEditingEvent(true);
    setIsEventModalOpen(true);
  };

  const openNewEventModal = (date = new Date().toISOString().split('T')[0]) => {
    setNewEvent({ title: '', description: '', location: '', type: 'Appointment' });
    setSelectedEventDate(date);
    setEventTime('10:00');
    setIsEditingEvent(false);
    setEditingEventId(null);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = (id) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(() => fetchEvents())
    .catch(err => console.error("Delete event error:", err));
  };

  const handleAddMed = (medData) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/medications`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(medData)
    })
    .then(res => res.json())
    .then(() => fetchMeds())
    .catch(err => console.error("Add med error:", err));
  };

  const handleTakeMed = (medId, slot = "General") => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/medications/${medId}/take?slot=${slot}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(() => fetchMeds())
    .catch(err => console.error("Take med error:", err));
  };

  const fetchHistory = (med) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    setHistoryMed(med);
    fetch(`${API_BASE_URL}/medications/${med.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setHistoryRecords)
    .catch(err => console.error("History error:", err));
  };

  const fetchAnalysisHistory = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/analysis-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        setAnalysisHistoryRecords(Array.isArray(data) ? data : []);
        setIsAnalysisHistoryModalOpen(true);
    })
    .catch(err => console.error("Fetch analysis history error:", err));
  };

  const handleDeleteMed = (medId) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/medications/${medId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(() => fetchMeds())
    .catch(err => console.error("Delete med error:", err));
  };
  
  // Fetch suggested symptoms when selection changes
  React.useEffect(() => {
    if (selectedSymptoms.length > 0) {
        setIsSuggesting(true);
        fetch(`${API_BASE_URL}/suggest-symptoms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedSymptoms)
        })
        .then(res => res.json())
        .then(newChips => {
            // Keep selected ones + new suggestions, unique items
            const combined = Array.from(new Set([...selectedSymptoms, ...newChips]));
            setAvailableChips(combined);
        })
        .catch(err => console.error("Suggestion error:", err))
        .finally(() => setIsSuggesting(false));
    } else {
        // Reset to default 10 if nothing selected
        setAvailableChips([
            'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Aching', 
            'Dizziness', 'Sore Throat', 'Chest Pain', 'Shortness of Breath'
        ]);
    }
  }, [selectedSymptoms]);

  // Add female symptom chips when user is female
  React.useEffect(() => {
    if (patient?.gender?.toLowerCase() === 'female' && selectedSymptoms.length === 0) {
      setAvailableChips([
        'Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Cramps',
        'Dizziness', 'Sore Throat', 'Chest Pain', 'Shortness of Breath',
        'Weakness', 'Sweating', 'Abdominal Pain', 'Mood Swings',
        'Bloating', 'Breast Tenderness'
      ]);
    }
  }, [patient]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('username');
    setUserRole('patient');
    setIsAuthenticated(false);
    setPatient(null);
    setMeds([]);
    setUserEvents([]);
    setNotifications([]);
  };

  const handleLoginSuccess = (token, username, rememberMe = true, role = 'patient', isNewDevice = false, email = '') => {
    if (!token) {
        // Verification needed
        setVerificationEmail(email);
        setShowVerification(true);
        return;
    }
    
    if (rememberMe) {
        localStorage.setItem('token', token);
    } else {
        sessionStorage.setItem('token', token);
    }
    localStorage.setItem('username', username);
    setUserRole('patient');
    setIsAuthenticated(true);
    setShowVerification(false);
    if (email) setAdminEmail(email);
    else if (username === 'Prince Fred Kent') setAdminEmail('princefredkent@gmail.com');
    // New device: show progressive sync toast while background pull runs
    if (isNewDevice) {
        setShowSyncToast(true);
        setSyncProgress(0);
        setSyncStatusMsg('Preparing your data...');
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
  };

  // Memoised cycle day — only recalculates when cycleLogs changes, not on every render
  const currentCycleDay = useMemo(() => {
    if (!cycleLogs || cycleLogs.length === 0) return null;
    const sorted = [...cycleLogs].sort((a, b) => new Date(b.period_start) - new Date(a.period_start));
    const latest = sorted[0];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(latest.period_start);
    const day = Math.round((today - start) / (1000 * 60 * 60 * 24)) + 1;
    const cycleLen = latest.cycle_length || 28;
    if (day > 0 && day <= cycleLen + 5) return day;
    return null;
  }, [cycleLogs]);

  // Poll /sync-progress while sync toast is visible (new-device first launch)
  React.useEffect(() => {
    if (!showSyncToast) return;
    const poll = setInterval(async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/sync-progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.progress != null) {
          setSyncProgress(data.progress);
          setSyncStatusMsg(data.status_msg || '');
        }
        if (data.done) {
          setSyncProgress(100);
          setSyncStatusMsg('All data synced!');
          fetchMeds(); fetchEvents();
          setTimeout(() => setShowSyncToast(false), 3000);
          clearInterval(poll);
        }
      } catch (e) { /* silent — offline is fine */ }
    }, 1500);
    return () => clearInterval(poll);
  }, [showSyncToast]);

  // Poll /sync-status every 60 s for the cloud badge in the header
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      fetch(`${API_BASE_URL}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => {
        if (d.email) setAdminEmail(d.email);
      });

      fetch(`${API_BASE_URL}/sync-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => { setSyncLastAt(d.last_sync_at); setSyncCloudOk(d.cloud_reachable); })
      .catch(() => setSyncCloudOk(false));
    };

    const fetchIntelligence = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      try {
        const [cRes, iRes] = await Promise.all([
          fetch(`${API_BASE_URL}/intelligence/conditions`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/intelligence/insights`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (cRes.ok && iRes.ok) {
          setIntelligenceData({ conditions: await cRes.json(), insights: await iRes.json() });
        }
      } catch (e) {}
    };

    fetchStatus();
    fetchIntelligence();
    const iv = setInterval(() => { fetchStatus(); fetchIntelligence(); }, 60000);
    return () => clearInterval(iv);
  }, [isAuthenticated, activeTab]);

  const handleSearchAction = (action) => {
    if (action.type === 'page') {
      setActiveTab(action.value);
      setSearchTerm('');
    }
    if (action.type === 'symptom') {
      toggleSymptom(action.value);
      setActiveTab('dashboard');
      setSearchTerm('');
    }
    if (action.type === 'med') {
        setActiveTab('meds');
        setSearchTerm('');
        setTimeout(() => {
            const el = document.getElementById(`med-${action.value}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    if (action.type === 'fact') {
        // We now show facts directly on the search page, 
        // but if triggered from elsewhere, we can still use the modal
        if (activeTab !== 'search') {
          setSelectedDetail(action);
          setSearchTerm('');
        }
    }
    closeDropdown();
  };

  const getSearchResults = () => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    const results = [];
    
    const sections = [
        { name: 'Dashboard', icon: 'home', tab: 'symptoms' },
        { name: 'Medications', icon: 'medication', tab: 'meds' },
        { name: 'Profile', icon: 'person', tab: 'profile' },
        { name: 'Settings', icon: 'settings', tab: 'settings' },
        { name: 'Cycle Tracker', icon: 'favorite', tab: 'cycle' }
    ];
    sections.forEach(s => {
        if (s.name.toLowerCase().includes(term)) 
            results.push({ type: 'page', title: s.name, subtitle: 'Application Section', icon: s.icon, value: s.tab });
    });

    availableChips.forEach(s => {
        if (s.toLowerCase().includes(term))
            results.push({ type: 'symptom', title: s, subtitle: 'Health Tracking', icon: 'monitor_heart', value: s });
    });

    meds.forEach(m => {
        if (m.name.toLowerCase().includes(term))
            results.push({ type: 'med', title: m.name, subtitle: `${m.dosage} - Medication`, icon: m.icon === 'pill' ? 'medication' : 'medication_liquid', value: m.id });
    });

    intelligenceData.conditions.forEach(c => {
        if (c.name.toLowerCase().includes(term))
            results.push({ type: 'fact', title: c.name, subtitle: c.explanation, icon: c.icon, isGeneral: true });
    });

    intelligenceData.insights.forEach(i => {
        if (i.title.toLowerCase().includes(term))
            results.push({ type: 'fact', title: i.title, subtitle: i.content, icon: i.icon, isGeneral: true });
    });

    return results;
  };


  // Automated Health Insight Engine (Notifications)
  React.useEffect(() => {
    if (isAuthenticated && meds.length > 0) {
        const checkMedNotifications = () => {
            const now = new Date();
            const hour = now.getHours();
            let currentSlot = '';
            if (hour >= 6 && hour < 11) currentSlot = 'Morning';
            else if (hour >= 11 && hour < 14) currentSlot = 'Noon';
            else if (hour >= 17 && hour < 21) currentSlot = 'Evening';
            else if (hour >= 21 || hour < 5) currentSlot = 'Bedtime';

            if (currentSlot) {
                const dueMeds = meds.filter(m => 
                    m.time?.split(',').map(t => t.trim()).includes(currentSlot) && 
                    (!m.taken_today || !m.taken_today.includes(currentSlot))
                );

                if (dueMeds.length > 0) {
                    const title = `${currentSlot} Medications`;
                    setNotifications(prev => {
                        if (prev.find(n => n.title === title)) return prev;
                        return [{
                            id: Date.now(),
                            type: 'reminder',
                            title: title,
                            text: `You have ${dueMeds.length} pending doses.`,
                            read: false
                        }, ...prev];
                    });
                }
            }
        };

        checkMedNotifications();
        const interval = setInterval(checkMedNotifications, 60000 * 5); 
        return () => clearInterval(interval);
    }
  }, [isAuthenticated, meds]);

  if (!isAuthenticated) {
    return (
      <>
        {showWelcome && (
          <WelcomeScreen onProceed={() => setShowWelcome(false)} />
        ) }
        {showVerification ? (
          <VerifyAccount 
            email={verificationEmail} 
            onVerificationSuccess={handleLoginSuccess}
            onBackToLogin={() => setShowVerification(false)}
          />
        ) : !showWelcome && (
          <div className="view-transition" key={authView}>
            {authView === 'login' && (
              <Login 
                onSwitch={(view) => setAuthView(view || 'signup')} 
                onLoginSuccess={(token, user, rem, role, dev, email) => handleLoginSuccess(token, user, rem, role, dev, email)}
              />
            )}
            {authView === 'signup' && (
              <Signup 
                onSwitch={() => setAuthView('login')} 
                onSignupAutoLogin={(token, user, rem, role, dev, email) => handleLoginSuccess(token, user, rem, role, dev, email)}
              />
            )}
            {authView === 'forgot-password' && (
              <ForgotPassword 
                onSwitch={() => setAuthView('login')} 
              />
            )}
          </div>
        )}
      </>
    );
  }

  if (isProfileIncomplete) {
    return (
      <Signup 
        startingStep={2}
        isCompletingProfile={true}
        onSignupAutoLogin={() => {
          fetchPatientData(); // Re-fetch to clear incomplete state and update patient info
          setIsProfileIncomplete(false); // Direct return to the dashboard
        }}
      />
    );
  }

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom) 
        : [...prev, symptom]
    );
  };

  const handleAnalyze = async () => {
    setAnalysis({ status: "Analyzing...", results: "Our AI is analyzing your symptoms..." });
    setIsCheckerCollapsed(true);
    try {
      const allSymptoms = [...selectedSymptoms];
      if (customSymptom.trim()) {
        allSymptoms.push(customSymptom.trim());
      }

      // For female users: inject cycle context into the request
      const isFemale = patient?.gender?.toLowerCase() === 'female';
      const requestBody = {
        symptoms: allSymptoms,
        ...(isFemale && cycleContext && { cycle_context: cycleContext })
      };

      const response = await fetch(`${API_BASE_URL}/analyze-symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Backend returned an error (e.g. 422 if server not restarted after update)
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.detail
          ? (typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail))
          : `Server error ${response.status}. Please restart the backend server.`;
        setAnalysis({ status: "Error", results: errMsg });
        return;
      }

      const data = await response.json();
      setAnalysis(data);

      if (isAuthenticated && data.status === "Success") {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/save-analysis`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            symptoms: allSymptoms,
            top_condition: data.top_condition,
            risk_level: data.risk_level,
            explanation: data.explanation
          })
        }).catch(err => console.error("Save analysis error:", err));
      }

      if (data.risk_level === 'High') {
          setCountdownTimer(5);
          setShowEmergencyCountdown(true);
      }
    } catch (error) {
      setAnalysis({ status: "Error", results: "Could not connect to the health server. Is the backend running?" });
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar expanded ${activeDropdown ? 'blur-content' : ''}`}>
        <div className="logo-container">
            <div className="logo-wrapper">
                <div className="logo-icon">
                    <img src="/logo.png" alt="Nexos Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                </div>
                <div className="logo-text">Nexos</div>
            </div>
        </div>

        <nav className="nav-icons">
              <div className={`nav-icon ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <span className="material-icons-round">home</span>
                <span className="nav-text">Dashboard</span>
              </div>
              <div className={`nav-icon ${activeTab === 'medications' ? 'active' : ''}`} onClick={() => setActiveTab('medications')}>
                <span className="material-icons-round">bar_chart</span>
                <span className="nav-text">Medications</span>
              </div>
              <div className={`nav-icon ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>
                <span className="material-icons-round">calendar_today</span>
                <span className="nav-text">Planner</span>
              </div>

          <div className={`nav-icon ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="material-icons-round">person_outline</span>
            <span className="nav-text">My Profile</span>
          </div>
          <div className={`nav-icon ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="material-icons-round">settings</span>
            <span className="nav-text">Settings</span>
          </div>
          
          <div 
            className={`nav-icon emergency-nav ${activeTab === 'emergency' ? 'active' : ''} ${isHoldingEmergency ? 'holding' : ''}`}
            onMouseDown={startEmergencyHold}
            onMouseUp={cancelEmergencyHold}
            onMouseLeave={cancelEmergencyHold}
            onTouchStart={startEmergencyHold}
            onTouchEnd={cancelEmergencyHold}
            onTouchCancel={cancelEmergencyHold}
          >
            <span className="material-icons-round">emergency</span>
            <span className="nav-text">
              {isHoldingEmergency ? `Hold (${Math.round(holdProgress)}%)` : 'Emergency'}
            </span>
            {isHoldingEmergency && (
              <div className="sidebar-hold-bar">
                <div className="sidebar-hold-bar-fill" style={{ width: `${holdProgress}%` }} />
              </div>
            )}
          </div>
        </nav>

        <div className="logout-icon" onClick={handleLogout} title="Logout">
            <span className="material-icons-round">logout</span>
            <span className="nav-text">Logout</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content fade-in">
        {/* ─── Mobile-Only Isolated Header ─── */}
        <header className="top-bar mobile-only">
          <div className="mobile-branding">
            <img src="/logo.png" alt="Nexos Logo" className="mobile-logo" />
            <span className="mobile-app-name">Nexos</span>
          </div>

          <div className="top-actions">
            <div 
              className="mobile-guide-badge"
              onClick={() => { setShowMobileTour(true); setTourStep(1); }}
              style={{ marginRight: '0.25rem' }}
            >
              <span className="material-icons-round" style={{ fontSize: '0.95rem' }}>explore</span>
              <span>Tour</span>
            </div>

            <div 
              className={`header-action-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <span className="material-icons-round">search</span>
            </div>

            <div style={{ position: 'relative' }} ref={notificationsRef}>
              <div 
                className={`header-action-btn ${activeDropdown === 'notifications' ? 'active' : ''}`}
                onClick={() => toggleDropdown('notifications')}
              >
                <span className="material-icons-round">notifications</span>
                {notifications.some(n => !n.read) && <div className="notification-badge"></div>}
              </div>
              
              {activeDropdown === 'notifications' && (
                <div className={`header-dropdown-panel notifications-panel origin-top-right ${closingDropdown === 'notifications' ? 'is-closing' : ''}`}>
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <span style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setNotifications([])}>Clear All</span>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{n.title}</h5>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.text}</p>
                      </div>
                    )) : (
                      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>All caught up!</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={mobileMenuRef}>
              <div 
                className={`header-action-btn ${activeDropdown === 'mobileMenu' ? 'active' : ''}`}
                onClick={() => toggleDropdown('mobileMenu')}
              >
                <span className="material-icons-round">settings</span>
              </div>

              {activeDropdown === 'mobileMenu' && (
                <div className={`header-dropdown-panel mobile-menu-panel origin-top-right ${closingDropdown === 'mobileMenu' ? 'is-closing' : ''}`}>
                  <div className="dropdown-header">
                    <h4>Menu & Tools</h4>
                  </div>
                  
                  <div className="menu-group-label">Quick Tools</div>
                  <div className="action-menu-item" onClick={() => { setIsAddMedModalOpen(true); closeDropdown(); }}>
                    <span className="material-icons-round">add_box</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Add Medication</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Record a new prescription</p>
                    </div>
                  </div>
                  <div className="action-menu-item" onClick={() => { setActiveTab('profile'); closeDropdown(); }}>
                    <span className="material-icons-round">emergency</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Medical Identity</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Age: {calculateAge(patient?.birth_date) || "N/A"} • Blood: {patient?.blood_type || "N/A"}</p>
                    </div>
                  </div>
                  <div className="action-menu-item" onClick={() => { fetchAnalysisHistory(); closeDropdown(); }}>
                    <span className="material-icons-round">history</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Analysis History</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Review past symptom checks</p>
                    </div>
                  </div>
                  {(adminEmail?.toLowerCase() === 'princefredkent@gmail.com' || localStorage.getItem('username') === 'Prince Fred Kent') && (
                    <div className="action-menu-item admin-tool" onClick={() => { setActiveTab('intelligence'); closeDropdown(); }} style={{ background: 'var(--primary-glow)', borderLeft: '3px solid var(--primary)' }}>
                      <span className="material-icons-round" style={{ color: 'var(--primary)' }}>psychology</span>
                      <div>
                        <h5 style={{ margin: 0, color: 'var(--primary)' }}>Intelligence Manager</h5>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manage diagnostic engine</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="menu-group-label">System</div>
                  <div className="action-menu-item" onClick={() => {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    if (token) fetch(`${API_BASE_URL}/sync-now`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                    closeDropdown();
                  }}>
                    <span className="material-icons-round" style={{ color: syncCloudOk === false ? '#ef4444' : syncCloudOk === true ? '#22c55e' : 'inherit' }}>
                      {syncCloudOk === false ? 'cloud_off' : 'cloud_done'}
                    </span>
                    <div>
                      <h5 style={{ margin: 0 }}>Sync Data</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{syncLastAt ? `Last: ${new Date(syncLastAt).toLocaleTimeString()}` : 'Click to sync now'}</p>
                    </div>
                  </div>
                  
                  <div className="action-menu-item" onClick={() => { setActiveTab('settings'); closeDropdown(); }}>
                    <span className="material-icons-round">settings</span>
                    <div>
                      <h5 style={{ margin: 0 }}>App Settings</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Theme and account preferences</p>
                    </div>
                  </div>
                  
                  <div className="menu-divider"></div>
                  
                  <div className="action-menu-item logout-item" onClick={() => { handleLogout(); closeDropdown(); }}>
                    <span className="material-icons-round" style={{ color: '#ef4444' }}>logout</span>
                    <div>
                      <h5 style={{ margin: 0, color: '#ef4444' }}>Logout</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sign out of your account</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── Desktop-Only Isolated Header ─── */}
        <header className="top-bar desktop-only">
          <div className="search-section" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div className="search-wrapper" ref={searchRef}>
              <div className="search-input-container">
                <span className="material-icons-round" style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}>search</span>
                <input 
                  type="text" 
                  className="search-box" 
                  style={{ paddingLeft: '3rem' }}
                  ref={searchInputRef}
                  placeholder="Search symptoms, meds, records..."
                  value={searchTerm}
                  onFocus={() => setActiveTab('search')}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (activeTab !== 'search') setActiveTab('search');
                  }}
                />
              </div>
            </div>
          </div>

          <div className="top-actions" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', color: 'var(--text-muted)', position: 'relative' }}>
            <div style={{ position: 'relative' }} ref={notificationsRef}>
              <div 
                className={`header-action-btn ${activeDropdown === 'notifications' ? 'active' : ''}`}
                onClick={() => toggleDropdown('notifications')}
              >
                <span className="material-icons-round">notifications</span>
                {notifications.some(n => !n.read) && <div className="notification-badge"></div>}
              </div>
              
              {activeDropdown === 'notifications' && (
                <div className={`header-dropdown-panel notifications-panel origin-top-right ${closingDropdown === 'notifications' ? 'is-closing' : ''}`}>
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <span style={{ fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setNotifications([])}>Clear All</span>
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem' }}>{n.title}</h5>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.text}</p>
                      </div>
                    )) : (
                      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>All caught up!</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }} ref={actionsRef}>
              <div 
                className={`header-action-btn ${activeDropdown === 'actions' ? 'active' : ''}`}
                onClick={() => toggleDropdown('actions')}
              >
                <span className="material-icons-round">medical_services</span>
              </div>
              
              {activeDropdown === 'actions' && (
                <div className={`header-dropdown-panel quick-actions-panel origin-top-right ${closingDropdown === 'actions' ? 'is-closing' : ''}`}>
                  <div className="dropdown-header">
                    <h4>Quick Tools</h4>
                  </div>
                  <div className="action-menu-item" onClick={() => { setIsAddMedModalOpen(true); closeDropdown(); }}>
                    <span className="material-icons-round">add_box</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Add Medication</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Record a new prescription</p>
                    </div>
                  </div>
                  <div className="action-menu-item" onClick={() => { setActiveTab('profile'); closeDropdown(); }}>
                    <span className="material-icons-round">emergency</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Medical Identity</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Age: {calculateAge(patient?.birth_date) || "N/A"} • Blood: {patient?.blood_type || "N/A"}</p>
                    </div>
                  </div>
                  <div className="action-menu-item" onClick={() => { setActiveTab('dashboard'); setIsCheckerCollapsed(false); closeDropdown(); }}>
                    <span className="material-icons-round">edit_note</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Log Symptoms</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Update your current status</p>
                    </div>
                  </div>
                  <div className="action-menu-item" onClick={() => { fetchAnalysisHistory(); closeDropdown(); }}>
                    <span className="material-icons-round">history</span>
                    <div>
                      <h5 style={{ margin: 0 }}>Analysis History</h5>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Review past symptom checks</p>
                    </div>
                  </div>
                  {(adminEmail?.toLowerCase() === 'princefredkent@gmail.com' || localStorage.getItem('username') === 'Prince Fred Kent') && (
                    <div className="action-menu-item admin-tool" onClick={() => { setActiveTab('intelligence'); closeDropdown(); }} style={{ background: 'var(--primary-glow)', borderLeft: '3px solid var(--primary)' }}>
                      <span className="material-icons-round" style={{ color: 'var(--primary)' }}>psychology</span>
                      <div>
                        <h5 style={{ margin: 0, color: 'var(--primary)' }}>Intelligence Manager</h5>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manage diagnostic engine</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content Container */}

        <div className={`dashboard-content ${activeDropdown ? 'blur-content' : ''}`}>

          {activeTab === 'search' && (
            <div className="search-page-container fade-in">
              <div className="search-hero">
                <h2>Health Intelligence</h2>
                <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Search your records, medications, and health library.</p>
                <div className="search-page-input-wrapper">
                  <span className="material-icons-round search-page-icon">search</span>
                  <input 
                    type="text" 
                    className="search-page-input" 
                    placeholder="Search symptoms, meds, tips..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        addToHistory(searchTerm.trim());
                      }
                    }}
                    autoFocus
                  />
                  {searchTerm && (
                    <span 
                      className="material-icons-round" 
                      style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}
                      onClick={() => setSearchTerm('')}
                    >
                      close
                    </span>
                  )}
                </div>
              </div>

              <div className="search-page-content">
                {searchTerm ? (
                  <div className="search-page-results">
                    {getSearchResults().length > 0 ? (
                      getSearchResults().map((res, i) => (
                        <div 
                          key={i} 
                          className={`search-result-detailed type-${res.type} ${res.isGeneral ? 'is-fact' : ''}`} 
                          onClick={() => handleSearchAction(res)}
                        >
                          <div className="result-header">
                            <div className="result-icon-box">
                              <span className="material-icons-round">{res.icon}</span>
                            </div>
                            <div className="result-title-group">
                              <span className="result-category">{res.type === 'fact' ? 'Health Library' : res.type === 'page' ? 'Navigation' : 'Record'}</span>
                              <h4>{res.title}</h4>
                            </div>
                            {res.type !== 'fact' && <span className="material-icons-round action-arrow">arrow_forward</span>}
                          </div>
                          
                          <div className="result-body">
                            {res.type === 'fact' ? (
                              <div className="fact-content">
                                <p className="fact-description">{res.subtitle}</p>
                                <div className="fact-meta">
                                  <span className="material-icons-round">verified</span>
                                  Verified Medical Insight
                                </div>
                              </div>
                            ) : (
                              <p className="result-subtitle">{res.subtitle}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="search-empty-results">
                        <span className="material-icons-round">search_off</span>
                        <p>No results found for "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="search-explore-area">
                    {searchHistory.length > 0 && (
                      <div className="search-suggestion-section">
                        <div className="section-header">
                          <h4>Recent Searches</h4>
                          <span className="clear-history" onClick={() => {
                            setSearchHistory([]);
                            localStorage.removeItem('nexos_search_history');
                          }}>Clear</span>
                        </div>
                        <div className="history-tags">
                          {searchHistory.map((item, i) => (
                            <div key={i} className="history-tag" onClick={() => setSearchTerm(item)}>
                              <span className="material-icons-round">history</span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="search-suggestion-section">
                      <h4>Suggested Health Insights</h4>
                      <div className="suggestion-grid">
                        <div className="suggestion-card" onClick={() => setSearchTerm('Malaria Prevention')}>
                          <span className="material-icons-round" style={{color: '#ef4444'}}>coronavirus</span>
                          <span>Malaria Tips</span>
                        </div>
                        <div className="suggestion-card" onClick={() => setSearchTerm('Dizziness causes')}>
                          <span className="material-icons-round" style={{color: '#f59e0b'}}>sensors</span>
                          <span>Dizziness</span>
                        </div>
                        <div className="suggestion-card" onClick={() => setSearchTerm('Stroke symptoms')}>
                          <span className="material-icons-round" style={{color: '#7c3aed'}}>psychology_alt</span>
                          <span>Stroke Info</span>
                        </div>
                        <div className="suggestion-card" onClick={() => setSearchTerm('Healthy Diet')}>
                          <span className="material-icons-round" style={{color: '#10b981'}}>restaurant</span>
                          <span>Nutrition</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/symptoms" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard patient={patient} meds={meds} userEvents={userEvents} analysis={analysis} handleAnalyze={handleAnalyze} selectedSymptoms={selectedSymptoms} toggleSymptom={toggleSymptom} availableChips={availableChips} customSymptom={customSymptom} setCustomSymptom={setCustomSymptom} setActiveTab={setActiveTab} isCheckerCollapsed={isCheckerCollapsed} setIsCheckerCollapsed={setIsCheckerCollapsed} intelligenceData={intelligenceData} setIsProfileIncomplete={setIsProfileIncomplete} />} />
            <Route path="/planner" element={<PlannerPage userEvents={userEvents} openNewEventModal={openNewEventModal} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />} />
            <Route path="/medications" element={<MedicationsPage meds={meds} handleTakeMed={handleTakeMed} setIsAddMedModalOpen={setIsAddMedModalOpen} fetchHistory={fetchHistory} handleDeleteMed={handleDeleteMed} />} />
            <Route path="/profile" element={<Profile patient={patient} onUpdate={(updatedUser) => setPatient(updatedUser)} meds={meds} userEvents={userEvents} analysisHistory={analysisHistoryRecords} />} />
            <Route path="/settings" element={<Settings patient={patient} onUpdate={fetchPatientData} theme={theme} setTheme={setTheme} adminEmail={adminEmail} onSwitchTab={setActiveTab} />} />
            <Route path="/cycle-tracker" element={<CycleTracker patient={patient} userEvents={userEvents} onDayClick={(date) => openNewEventModal(date.toISOString().split('T')[0])} />} />
            <Route path="/emergency" element={<Emergency patient={patient} autoEngaged={isEmergencyProtocolEngaged} />} />
            <Route path="/intelligence" element={<IntelligenceManager adminEmail={adminEmail} />} />
          </Routes>
        </div>
      </main>

      {/* Right Sidebar - Only on Dashboard/Symptoms */}
      {((activeTab === 'dashboard' || activeTab === 'symptoms') && patient) && (
        <aside className="aside slide-in-right">
          {showGreeting && (
            <div className={`profile-greeting fade-out-timer`}>
                <div className="greeting-icon">
                    <span className="material-icons-round">waving_hand</span>
                </div>
                <div className="greeting-text">
                    <span className="time-tag">{getGreeting()}</span>
                    <h4>{patient?.full_name || localStorage.getItem('username')}!</h4>
                </div>
            </div>
          )}
          <section className="profile-card">
            <h3>MY PROFILE</h3>
            <div className="profile-avatar" style={{ overflow: 'hidden' }}>
              <img 
                src={patient?.profile_picture || (patient?.gender?.toLowerCase() === 'female' ? '/female.png' : '/male.png')} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            </div>
            <h2>{patient?.full_name || localStorage.getItem('username') || 'User'}</h2>
            <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Patient ID: #NX-2026</p>
            
            <div className="profile-details" style={{textAlign: 'left'}}>
                <div className="detail-item">
                    <span className="detail-label">Age</span>
                    <span className="detail-value">
                      {patient.birth_date ? (() => {
                        const birth = new Date(patient.birth_date);
                        const today = new Date();
                        let age = today.getFullYear() - birth.getFullYear();
                        const m = today.getMonth() - birth.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                        return age;
                      })() : (patient.age || 'N/A')}
                    </span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Blood</span>
                    <span className="detail-value">{patient.blood_type || 'Unknown'}</span>
                </div>
            </div>
          </section>

          <section className="calendar-card">
            <h3>MY CALENDAR</h3>
            <p style={{fontWeight: 600, marginTop: '0.5rem'}}>{new Date().toLocaleString('en-US', { month: 'long' })}</p>
            <div className="mini-cal" style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8rem', textAlign: 'center'}}>
                {['S','M','T','W','T','F','S'].map(d => <span key={d} style={{opacity: 0.5}}>{d}</span>)}
                {Array.from({length: 31}, (_, i) => {
                    const dayNum = i + 1;
                    const hasEvents = userEvents.some(e => {
                        const ed = new Date(e.appointment_date);
                        return ed.getDate() === dayNum && ed.getMonth() === new Date().getMonth() && ed.getFullYear() === new Date().getFullYear();
                    });
                    return (
                        <span key={i} style={{
                            padding: '5px', 
                            borderRadius: '50%', 
                            background: (dayNum === new Date().getDate()) ? 'white' : 'transparent',
                            color: (dayNum === new Date().getDate()) ? 'var(--primary)' : 'inherit',
                            position: 'relative'
                        }}>
                            {dayNum}
                            {hasEvents && <div className="event-marker-dot" style={{position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px'}}></div>}
                        </span>
                    );
                })}
            </div>
          </section>

          <section className="upcoming-integrated-card" style={{marginTop: '1.5rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h3 style={{fontSize: '0.9rem', letterSpacing: '1px'}}>UPCOMING</h3>
                    <button onClick={() => setActiveTab('planner')} style={{background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'}}>VIEW ALL</button>
                </div>
                <div className="integrated-planner-list" style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                    {userEvents.length > 0 ? (
                        userEvents.slice(0, 3).map(event => (
                            <div key={event.id} className="mini-event-row" style={{display: 'flex', gap: '0.8rem', alignItems: 'center'}}>
                                <div style={{width: '38px', height: '38px', background: 'var(--bg-main)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'}}>
                                    <span style={{fontSize: '0.6rem', opacity: 0.5}}>{new Date(event.appointment_date).toLocaleString('en-US', { month: 'short' })}</span>
                                    {new Date(event.appointment_date).getDate()}
                                </div>
                                <div style={{flex: 1, minWidth: 0}}>
                                    <h4 style={{fontSize: '0.85rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{event.title}</h4>
                                    <p style={{fontSize: '0.7rem', margin: 0, opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <span className="material-icons-round" style={{fontSize: '0.9rem', opacity: 0.7}}>schedule</span>
                                        {event.type} • {new Date(event.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{textAlign: 'center', padding: '1rem', border: '1px dashed var(--border)', borderRadius: '15px', opacity: 0.6}}>
                            <p style={{fontSize: '0.8rem', margin: '0 0 0.5rem 0'}}>No health plans</p>
                            <button className="btn-primary-mini" onClick={() => openNewEventModal()} style={{fontSize: '0.7rem', padding: '0.4rem 0.8rem'}}>+ ADD PLAN</button>
                        </div>
                    )}
                </div>
          </section>

          <section className="emergency-card-aside">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                <h3 style={{margin: 0}}>EMERGENCY</h3>
                {!patient.emergency_contact_phone && (
                  <span className="material-icons-round" style={{color: '#ef4444', fontSize: '1.1rem'}}>priority_high</span>
                )}
              </div>
              {patient.emergency_contact_phone ? (
                <>
                  <p className="contact-name">{patient.emergency_contact_name || 'Contact N/A'}</p>
                  <p className="contact-phone">{patient.emergency_contact_phone}</p>
                </>
              ) : (
                <div style={{marginTop: '0.5rem'}}>
                  <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.8rem 0'}}>No Emergency Contact Set</p>
                  <button 
                    onClick={() => setActiveTab('profile')}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <span className="material-icons-round" style={{fontSize: '1rem'}}>add_circle</span>
                    ADD CONTACT
                  </button>
                </div>
              )}
          </section>
        </aside>
      )}
      {/* Modals */}
      <AddMedicationModal 
        isOpen={isAddMedModalOpen}
        onClose={() => setIsAddMedModalOpen(false)}
        onAdd={handleAddMed}
        patient={patient}
      />

      {/* Medication History Modal */}
      {historyMed && (
        <div className="modal-overlay fade-in" onClick={() => setHistoryMed(null)}>
            <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
                <div className="modal-header">
                    <div className="header-title-group">
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                            <span className="material-icons-round" style={{color: 'var(--primary)', fontSize: '2rem'}}>history</span>
                            <div>
                                <h2 style={{margin: 0}}>{historyMed.name}</h2>
                                <p style={{fontSize: '0.85rem', opacity: 0.7}}>{historyMed.dosage} - History</p>
                            </div>
                        </div>
                    </div>
                    <button className="close-btn" onClick={() => setHistoryMed(null)}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                
                <div className="history-list" style={{marginTop: '1.5rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem'}}>
                    {historyRecords.length > 0 ? historyRecords.map((record, idx) => {
                        const date = new Date(record.taken_at);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                            <div key={idx} className="history-item" style={{
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '1rem',
                                borderBottom: '1px solid var(--border)',
                                animationDelay: `${idx * 0.05}s`
                            }}>
                                <div className="history-time-group" style={{display: 'flex', alignItems: 'center'}}>
                                    <span style={{
                                        fontSize: '0.65rem', 
                                        fontWeight: 800, 
                                        textTransform: 'uppercase',
                                        background: 'rgba(67, 97, 238, 0.1)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        color: 'var(--primary)',
                                        marginRight: '0.8rem'
                                    }}>{record.slot}</span>
                                    <span style={{fontWeight: 600}}>{isToday ? 'Today' : date.toLocaleDateString()}</span>
                                </div>
                                <span style={{fontSize: '0.9rem', opacity: 0.6}}>
                                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        );
                    }) : (
                        <div style={{textAlign: 'center', padding: '3rem 0', opacity: 0.3}}>
                            <span className="material-icons-round" style={{fontSize: '3.5rem'}}>query_stats</span>
                            <p style={{marginTop: '1rem'}}>No history recorded yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      {/* Search Detail Modal */}
      {selectedDetail && (
        <div className={`search-detail-overlay ${isClosingDetail ? 'is-closing' : ''}`} onClick={closeDetail}>
            <div className={`search-detail-modal ${isClosingDetail ? 'is-closing' : ''}`} onClick={e => e.stopPropagation()}>
                <button className="close-detail-btn" onClick={closeDetail}>
                    <span className="material-icons-round">close</span>
                </button>
                <div className="detail-header">
                    <div className="detail-icon-box">
                        <span className="material-icons-round">{selectedDetail.icon}</span>
                    </div>
                    <div className="detail-title-group">
                        <div className="detail-badge">Health Library</div>
                        <h2>{selectedDetail.title}</h2>
                    </div>
                </div>
                <div className="detail-body">
                    <h4>Clinical Overview & Facts</h4>
                    <p>{selectedDetail.subtitle}</p>
                </div>
                <div className="detail-actions">
                    <button className="detail-btn secondary" onClick={closeDetail}>
                        Dismiss
                    </button>
                    {selectedDetail.type === 'fact' && (
                        <button className="detail-btn primary" onClick={() => { setSearchTerm(selectedDetail.title); setActiveTab('search'); closeDetail(); }}>
                            <span className="material-icons-round">search</span>
                            Continue Search
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Analysis History Modal */}
      {isAnalysisHistoryModalOpen && (
        <div className="modal-overlay fade-in" onClick={() => setIsAnalysisHistoryModalOpen(false)}>
            <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', width: '90%'}}>
                <div className="modal-header">
                    <div className="header-title-group">
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                            <span className="material-icons-round" style={{color: 'var(--primary)', fontSize: '2rem'}}>history</span>
                            <div>
                                <h2 style={{margin: 0}}>Analysis History</h2>
                                <p style={{fontSize: '0.85rem', opacity: 0.7}}>Review your past symptom assessments</p>
                            </div>
                        </div>
                    </div>
                    <div style={{display: 'flex', gap: '0.8rem'}}>
                        <button 
                            className="btn-primary-mini" 
                            onClick={handleDownloadAnalysisHistory}
                            style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(67, 97, 238, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary-glow)'}}
                        >
                            <span className="material-icons-round" style={{fontSize: '1.2rem'}}>file_download</span>
                            Export PDF
                        </button>
                        <button className="close-btn" onClick={() => setIsAnalysisHistoryModalOpen(false)}>
                            <span className="material-icons-round">close</span>
                        </button>
                    </div>
                </div>
                
                <div className="history-list custom-scrollbar" style={{marginTop: '1.5rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {analysisHistoryRecords.length > 0 ? analysisHistoryRecords.map((record, idx) => {
                        const date = new Date(record.timestamp);
                        return (
                            <div key={idx} className="stat-card" style={{padding: '1.2rem', margin: 0, animationDelay: `${idx * 0.05}s`}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem'}}>
                                    <div>
                                        <h4 style={{fontSize: '1.1rem', margin: '0 0 0.3rem 0', color: 'var(--text-main)'}}>{record.top_condition || "Assessment"}</h4>
                                        <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{date.toLocaleString()}</span>
                                    </div>
                                    <span className={`risk-badge ${record.risk_level?.toLowerCase() || 'medium'}`} style={{fontSize: '0.75rem'}}>
                                        {record.risk_level} Risk
                                    </span>
                                </div>
                                
                                {record.symptoms && record.symptoms.length > 0 && (
                                    <div style={{marginBottom: '0.8rem'}}>
                                        <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem'}}>Reported Symptoms</div>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.4rem'}}>
                                            {record.symptoms.map((s, i) => (
                                                <span key={i} style={{fontSize: '0.75rem', background: 'var(--bg-main)', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid var(--border)'}}>{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {record.explanation && (
                                    <div style={{fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', background: 'var(--bg-main)', padding: '0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)'}}>
                                        {record.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div style={{textAlign: 'center', padding: '3rem 0', opacity: 0.5}}>
                            <span className="material-icons-round" style={{fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--primary)'}}>history_toggle_off</span>
                            <h3>No History Found</h3>
                            <p>You haven't performed any symptom analyses yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* User Event Modal - Moved to global stack */}
      {isEventModalOpen && (
        <div className="modal-overlay fade-in" onClick={() => setIsEventModalOpen(false)}>
          <div className="modal-content glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
                <div className="header-title-group">
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                        <span className="material-icons-round" style={{color: 'var(--primary)', fontSize: '2rem'}}>event</span>
                        <div>
                            <h2 style={{margin: 0}}>{isEditingEvent ? 'Edit Health Plan' : 'New Health Plan'}</h2>
                            <p style={{fontSize: '0.85rem', opacity: 0.7}}>{isEditingEvent ? 'Modify your scheduled event' : 'Schedule an upcoming event'}</p>
                        </div>
                    </div>
                </div>
                <button className="close-btn" onClick={() => setIsEventModalOpen(false)}>
                    <span className="material-icons-round">close</span>
                </button>
            </div>
            
            <div className="modal-body" style={{marginTop: '1.5rem'}}>
                <div className="input-group filled">
                  <input type="text" placeholder=" " value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                  <label>Title (e.g. Dentist Appt)</label>
                </div>
                <div className="input-group filled">
                  <input type="date" value={selectedEventDate} onChange={e => setSelectedEventDate(e.target.value)} />
                  <label>Date</label>
                </div>
                <div className="input-group filled">
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} />
                  <label>Time</label>
                </div>
                <div className={`planner-type-extender ${isPlannerTypeExpanded ? 'expanded' : ''}`}>
                  <div className="extender-header" onClick={() => setIsPlannerTypeExpanded(!isPlannerTypeExpanded)}>
                    <div className="type-option-content">
                      <div className="type-option-icon">
                        <span className="material-icons-round">
                          {[
                            { id: 'Appointment', icon: 'medical_services' },
                            { id: 'Exercise', icon: 'fitness_center' },
                            { id: 'Lab Test', icon: 'science' },
                            { id: 'Medication', icon: 'medication' },
                            { id: 'Other', icon: 'event_note' }
                          ].find(i => i.id === newEvent.type)?.icon}
                        </span>
                      </div>
                      <div className="type-option-info">
                        <h5>{
                          [
                            { id: 'Appointment', label: 'Medical Appointment' },
                            { id: 'Exercise', label: 'Exercise/Workout' },
                            { id: 'Lab Test', label: 'Lab Test' },
                            { id: 'Medication', label: 'Medication Start' },
                            { id: 'Other', label: 'Other Plan' }
                          ].find(i => i.id === newEvent.type)?.label
                        }</h5>
                        <p>Tap to change plan type</p>
                      </div>
                    </div>
                    <span className="material-icons-round expand-icon">
                      {isPlannerTypeExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>

                  {isPlannerTypeExpanded && (
                    <div className="extender-options fade-in">
                      {[
                        { id: 'Appointment', label: 'Medical Appointment', icon: 'medical_services', desc: 'Doctors, specialists, clinic visits' },
                        { id: 'Exercise', label: 'Exercise/Workout', icon: 'fitness_center', desc: 'Gym, cardio, yoga, rehabilitation' },
                        { id: 'Lab Test', label: 'Lab Test', icon: 'science', desc: 'Blood work, X-rays, diagnostics' },
                        { id: 'Medication', label: 'Medication Start', icon: 'medication', desc: 'New prescription cycles' },
                        { id: 'Other', label: 'Other Plan', icon: 'event_note', desc: 'Miscellaneous health-related events' }
                      ].map(item => (
                        <div 
                          key={item.id} 
                          className={`planner-type-option mini ${newEvent.type === item.id ? 'active' : ''}`}
                          onClick={() => {
                            setNewEvent({...newEvent, type: item.id});
                            setIsPlannerTypeExpanded(false);
                          }}
                        >
                          <div className="type-option-content">
                            <div className="type-option-icon small">
                              <span className="material-icons-round">{item.icon}</span>
                            </div>
                            <div className="type-option-info">
                              <h5>{item.label}</h5>
                            </div>
                          </div>
                          <div className="type-radio small"></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="input-group filled">
                  <input type="text" placeholder=" " value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                  <label>Location (Optional)</label>
                </div>
                <div className="input-group filled">
                  <textarea placeholder=" " rows="3" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} style={{width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', resize: 'none'}} />
                  <label>Notes/Details</label>
                </div>
                <button className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem' }} onClick={handleAddEvent}>{isEditingEvent ? 'Update Plan' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Countdown Modal */}
      {showEmergencyCountdown && (
        <div className="modal-overlay emergency-overlay fade-in">
            <div className="modal-content glass-modal slide-in-top critical-modal" onClick={e => e.stopPropagation()}>
                <div className="urgent-pulse-bg"></div>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                    <div className="pulse-ring-container large" style={{ margin: '0 auto 1.5rem' }}>
                        <div className="pulse-dot"></div>
                        <div className="pulse-ring"></div>
                    </div>
                    <h2 style={{ color: '#ef4444', fontSize: '2rem', marginBottom: '0.5rem' }}>CRITICAL RISK DETECTED</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2rem', padding: '0 1rem' }}>
                        Your symptoms indicate a potentially life-threatening condition. 
                        Engaging Emergency Response Protocol in:
                    </p>
                    
                    <div className="countdown-display">
                        <span>{countdownTimer}</span>
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                        <button className="btn-emergency-cancel" onClick={cancelEmergency}>
                            Cancel
                        </button>
                        <button className="btn-emergency-proceed" onClick={handleProceedEmergency}>
                            Engage Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className={`bottom-nav ${showMobileTour ? 'tour-active' : ''}`}>
        <div className="bottom-nav-inner">
          {/* Dashboard */}
          <div
            className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''} ${showMobileTour && tourStep === 2 ? 'tour-highlight' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="material-icons-round">home</span>
            <span className="bottom-nav-label">Home</span>
          </div>

          {/* Medications */}
          <div
            className={`bottom-nav-item ${activeTab === 'medications' ? 'active' : ''} ${showMobileTour && tourStep === 3 ? 'tour-highlight' : ''}`}
            onClick={() => setActiveTab('medications')}
          >
            <span className="material-icons-round">medication</span>
            <span className="bottom-nav-label">Meds</span>
          </div>

          {/* Emergency — Centre FAB */}
          <div
            className={`bottom-nav-emergency ${activeTab === 'emergency' ? 'active' : ''} ${showMobileTour && tourStep === 4 ? 'tour-highlight' : ''}`}
            onMouseDown={startEmergencyHold}
            onMouseUp={cancelEmergencyHold}
            onMouseLeave={cancelEmergencyHold}
            onTouchStart={startEmergencyHold}
            onTouchEnd={cancelEmergencyHold}
            onTouchCancel={cancelEmergencyHold}
          >
            <div className={`bottom-nav-emergency-btn ${isHoldingEmergency ? 'holding' : ''}`}>
              <span className="material-icons-round">emergency</span>
              {isHoldingEmergency && (
                <svg className="sos-hold-ring" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="25"
                    strokeDasharray="157"
                    strokeDashoffset={157 - (157 * holdProgress) / 100}
                  />
                </svg>
              )}
            </div>
            <span className="bottom-nav-emergency-label">{isHoldingEmergency ? 'HOLD...' : 'SOS'}</span>
          </div>

          {/* Planner */}
          <div
            className={`bottom-nav-item ${activeTab === 'planner' ? 'active' : ''} ${showMobileTour && tourStep === 5 ? 'tour-highlight' : ''}`}
            onClick={() => setActiveTab('planner')}
          >
            <span className="material-icons-round">calendar_today</span>
            <span className="bottom-nav-label">Planner</span>
          </div>

          {/* Profile */}
          <div
            className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''} ${showMobileTour && tourStep === 6 ? 'tour-highlight' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="material-icons-round">person_outline</span>
            <span className="bottom-nav-label">Profile</span>
          </div>
        </div>
      </nav>

      {/* ── Floating Cycle / Period Button (female only, all screens) ── */}
      {patient?.gender?.toLowerCase() === 'female' && (
        <div
          className={`cycle-fab ${activeTab === 'cycle-tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('cycle-tracker')}
          title={currentCycleDay ? `Day ${currentCycleDay} of cycle` : 'Track Cycle'}
        >
          <div className="cycle-fab-btn">
            <span className="material-icons-round">favorite</span>
          </div>
          <span className="cycle-fab-label">
            {currentCycleDay ? `Day ${currentCycleDay}` : 'My Cycle'}
          </span>
        </div>
      )}

      {/* ── Sync Progress Toast (new-device first launch) ── */}
      {showSyncToast && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.2rem', zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '18px', padding: '1rem 1.2rem', minWidth: '290px', maxWidth: '340px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)', backdropFilter: 'blur(24px)',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
          animation: 'slide-in-top 0.35s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className="material-icons-round"
                style={{ color: 'var(--primary)', fontSize: '1.2rem',
                  animation: syncProgress < 100 ? 'spin 1.5s linear infinite' : 'none' }}
              >sync</span>
              <strong style={{ fontSize: '0.88rem' }}>
                {syncProgress >= 100 ? '✓ All data synced!' : 'Syncing your data'}
              </strong>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
              {syncProgress ?? 0}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'var(--bg-main)', borderRadius: '50px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '50px',
              background: 'linear-gradient(90deg, var(--primary), #818cf8)',
              width: `${syncProgress ?? 0}%`, transition: 'width 0.6s ease'
            }} />
          </div>

          {syncStatusMsg && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {syncStatusMsg}
            </p>
          )}
        </div>
      )}

      {/* ── Mobile Navigation Tour Guide ── */}
      {showMobileTour && (
        <div 
          className="mobile-guide-overlay" 
          onClick={() => { setShowMobileTour(false); localStorage.setItem('nexos_mobile_tour_completed', 'true'); }}
        >
          <div className={`mobile-guide-card ${tourStep > 1 ? 'pointing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="mobile-guide-header">
              <span className="guide-step-indicator">Step {tourStep} of 6</span>
              <button 
                className="guide-close-btn" 
                onClick={() => { setShowMobileTour(false); localStorage.setItem('nexos_mobile_tour_completed', 'true'); }}
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>
            
            <div className="mobile-guide-body">
              <div className="guide-illustration-wrapper">
                {tourStep === 1 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="svg-float">
                    <circle cx="100" cy="75" r="60" stroke="rgba(67, 97, 238, 0.15)" strokeWidth="2" strokeDasharray="6 6" />
                    <circle cx="100" cy="75" r="45" stroke="rgba(129, 140, 248, 0.2)" strokeWidth="1.5" className="svg-rotate" style={{transformOrigin: 'center'}} />
                    <circle cx="45" cy="50" r="6" fill="#ef4444" className="svg-pulse" />
                    <circle cx="155" cy="100" r="5" fill="#10b981" />
                    <circle cx="140" cy="40" r="7" fill="var(--primary)" />
                    <rect x="75" y="20" width="50" height="110" rx="10" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="3" style={{filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))'}} />
                    <rect x="80" y="30" width="40" height="90" rx="6" fill="rgba(67, 97, 238, 0.05)" />
                    <rect x="94" y="24" width="12" height="2" rx="1" fill="var(--primary)" opacity="0.5" />
                    <rect x="92" y="114" width="16" height="2" rx="1" fill="var(--primary)" opacity="0.6" />
                    <line x1="85" y1="50" x2="115" y2="50" stroke="rgba(67, 97, 238, 0.2)" strokeWidth="2" />
                    <line x1="85" y1="65" x2="105" y2="65" stroke="rgba(67, 97, 238, 0.2)" strokeWidth="2" />
                    <line x1="85" y1="80" x2="110" y2="80" stroke="rgba(67, 97, 238, 0.2)" strokeWidth="2" />
                  </svg>
                )}
                {tourStep === 2 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="svg-float">
                    <rect x="30" y="20" width="140" height="110" rx="16" fill="rgba(67, 97, 238, 0.04)" stroke="var(--border)" strokeWidth="1.5" />
                    <path d="M 40 75 Q 60 75 70 75 L 75 50 L 80 100 L 85 75 Q 95 75 110 75 L 115 60 L 120 90 L 125 75 L 160 75" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 100 50 C 95 40, 80 40, 80 55 C 80 70, 100 85, 100 88 C 100 85, 120 70, 120 55 C 120 40, 105 40, 100 50 Z" fill="#ef4444" className="svg-pulse" style={{transformOrigin: '100px 60px'}} />
                    <circle cx="50" cy="110" r="8" fill="#10b981" />
                    <path d="M 47 110 L 49 112 L 53 108" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="150" cy="40" r="8" fill="var(--primary)" />
                    <path d="M 147 40 L 149 42 L 153 38" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                {tourStep === 3 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="svg-float">
                    <circle cx="100" cy="75" r="45" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="2" strokeDasharray="5 5" />
                    <line x1="100" y1="75" x2="100" y2="45" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeLinecap="round" className="svg-rotate" style={{transformOrigin: '100px 75px'}} />
                    <line x1="100" y1="75" x2="120" y2="75" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeLinecap="round" />
                    <g transform="translate(100, 75) rotate(-35) translate(-35, -15)">
                      <rect x="0" y="0" width="35" height="30" rx="15" fill="var(--primary)" />
                      <rect x="35" y="0" width="35" height="30" rx="15" fill="#a5b4fc" />
                      <path d="M 10 7 Q 20 12 35 12 L 60 12" stroke="white" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
                    </g>
                    <circle cx="60" cy="40" r="3" fill="#fbbf24" className="svg-pulse" />
                    <circle cx="145" cy="110" r="4" fill="#fbbf24" />
                  </svg>
                )}
                {tourStep === 4 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none">
                    <circle cx="100" cy="75" r="65" stroke="#ef4444" strokeWidth="1.5" opacity="0.15" className="svg-pulse" style={{transformOrigin: 'center'}} />
                    <circle cx="100" cy="75" r="50" stroke="#ef4444" strokeWidth="2" opacity="0.35" className="svg-pulse" style={{transformOrigin: 'center', animationDelay: '0.5s'}} />
                    <circle cx="100" cy="75" r="35" fill="#ef4444" stroke="#fee2e2" strokeWidth="3" />
                    <text x="100" y="82" fill="white" fontSize="18" fontWeight="900" textAnchor="middle" letterSpacing="1px">SOS</text>
                    <g transform="translate(130, 40)">
                      <circle cx="0" cy="0" r="10" fill="#ef4444" />
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="2" />
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="2" />
                    </g>
                  </svg>
                )}
                {tourStep === 5 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="svg-float">
                    <rect x="40" y="20" width="120" height="110" rx="12" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5" style={{filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.08))'}} />
                    <path d="M 40 32 L 160 32" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="20" strokeLinecap="square" />
                    <circle cx="55" cy="32" r="5" fill="#3b82f6" />
                    <circle cx="70" cy="32" r="5" fill="#10b981" />
                    <g transform="translate(50, 55)">
                      <circle cx="10" cy="10" r="7" fill="#10b981" />
                      <path d="M 7 10 L 9 12 L 13 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="25" y1="10" x2="90" y2="10" stroke="var(--text-muted)" strokeWidth="3" opacity="0.3" strokeLinecap="round" />
                      <circle cx="10" cy="30" r="7" fill="#10b981" />
                      <path d="M 7 30 L 9 32 L 13 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="25" y1="30" x2="80" y2="30" stroke="var(--text-muted)" strokeWidth="3" opacity="0.3" strokeLinecap="round" />
                      <circle cx="10" cy="50" r="7" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="1.5" />
                      <line x1="25" y1="50" x2="95" y2="50" stroke="var(--text-muted)" strokeWidth="3" opacity="0.3" strokeLinecap="round" />
                    </g>
                  </svg>
                )}
                {tourStep === 6 && (
                  <svg width="200" height="150" viewBox="0 0 200 150" fill="none" className="svg-float">
                    <circle cx="100" cy="75" r="55" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <path d="M 100 30 Q 135 30 140 55 Q 140 95 100 120 Q 60 95 60 55 Q 65 30 100 30 Z" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="2.5" style={{filter: 'drop-shadow(0 8px 20px rgba(16, 185, 129, 0.2))'}} />
                    <g transform="translate(87, 57)">
                      <path d="M 6 10 C 6 2, 20 2, 20 10 L 20 15 L 6 15 Z" stroke="#10b981" strokeWidth="2.5" fill="none" />
                      <rect x="0" y="14" width="26" height="20" rx="5" fill="#10b981" />
                      <circle cx="13" cy="22" r="3" fill="white" />
                      <path d="M 13 24 L 13 30" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  </svg>
                )}
              </div>
              
              <h3 className="guide-step-title">
                {tourStep === 1 && "Welcome to Nexos Mobile!"}
                {tourStep === 2 && "1. Home & Daily Check-In"}
                {tourStep === 3 && "2. Medications Locker"}
                {tourStep === 4 && "3. Central SOS Beacon"}
                {tourStep === 5 && "4. Daily Health Planner"}
                {tourStep === 6 && "5. Bio-Profile Security"}
              </h3>
              
              <p className="guide-step-text">
                {tourStep === 1 && "NEXOS brings clinical-grade AI diagnostics, health vitals charts, medication logging, and advanced safety protocols right to your mobile device."}
                {tourStep === 2 && "Tap Home to check daily symptoms, review AI health assessments, scan body metrics, and complete clinical-grade check-ins."}
                {tourStep === 3 && "Track your prescriptions, log schedules, and view dosage notifications. Easily record daily multivitamin and clinical prescriptions."}
                {tourStep === 4 && "Press and hold the SOS button for 3 seconds to engage Emergency Protocols. This broadcasts live GPS coordinates and vitals alerts to saved emergency contacts."}
                {tourStep === 5 && "Schedule doctor appointments, monitor custom medical logs, and coordinate wellness targets in a simplified planner timeline."}
                {tourStep === 6 && "Safeguard crucial biological details. Edit emergency contacts, lock key login emails for high security, and update health cards safely."}
              </p>
            </div>
            
            <div className="mobile-guide-footer">
              <button 
                className="guide-btn-skip" 
                onClick={() => { setShowMobileTour(false); localStorage.setItem('nexos_mobile_tour_completed', 'true'); }}
              >
                Skip
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {tourStep > 1 && (
                  <button className="guide-btn-back" onClick={() => setTourStep(prev => prev - 1)}>
                    Back
                  </button>
                )}
                <button 
                  className="guide-btn-next" 
                  onClick={() => {
                    if (tourStep < 6) {
                      setTourStep(prev => prev + 1);
                    } else {
                      setShowMobileTour(false);
                      localStorage.setItem('nexos_mobile_tour_completed', 'true');
                    }
                  }}
                >
                  {tourStep === 6 ? "Let's Go!" : 'Next'}
                  <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>
                    {tourStep === 6 ? 'check_circle' : 'chevron_right'}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Dynamic Pointing Arrow */}
            {tourStep > 1 && (
              <div 
                className="guide-pointing-arrow" 
                style={{
                  left: tourStep === 2 ? '10%' :
                        tourStep === 3 ? '30%' :
                        tourStep === 4 ? '50%' :
                        tourStep === 5 ? '70%' : '90%'
                }}
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
