# Nexos Health AI - Project Documentation

## 1. Project Overview
Nexos is a premium, AI-driven Health Assistant designed to provide patients with a seamless, "offline-first" medical experience. Built with a focus on modern aesthetics (Elite Glassmorphism) and robust data integrity, Nexos bridges the gap between local speed and cloud reliability.

### Core Philosophy
- **Offline-First**: All data is stored locally in SQLite for instant access and zero-latency performance.
- **Seamless Sync**: Background processes keep local data synchronized with a Supabase cloud backend.
- **Premium Design**: A high-end glassmorphic UI that feels native and responsive on both mobile and desktop.
- **Privacy & Security**: Secure authentication via JWT and OTP verification.

---

## 2. Tech Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Vanilla CSS (Custom Glassmorphic System)
- **Icons**: Lucide React & Google Material Symbols
- **State Management**: React Hooks (useState, useEffect, useMemo)
- **Deployment**: Cloudflare Pages

### Backend
- **Framework**: FastAPI (Python)
- **Database ORM**: SQLAlchemy
- **Scheduling**: APScheduler (for background sync)
- **Email**: smtplib (SSL/TLS support)
- **Deployment**: Render

### Database
- **Local**: SQLite (Edge storage)
- **Cloud**: Supabase (PostgreSQL)
- **Sync Logic**: Custom bidirectional sync service with last-write-wins resolution.

---

## 3. Key Features

### 🩺 Intelligence Manager (Symptom Analysis)
- **AI Analysis**: Analyzes user-input symptoms to provide potential conditions and risk levels.
- **Smart Suggestions**: Suggests related symptoms based on initial input.
- **Context Awareness**: Incorporates female cycle context for more accurate diagnosis.
- **History**: Persists past analyses for long-term health tracking.

### 📅 Cycle Tracker (Women's Health)
- **Period Logging**: Easy logging of period start and end dates.
- **Duration Chips**: Custom high-end selection interface for period and cycle duration.
- **Automation**: Intelligently calculates estimated end dates based on user history.
- **Insights**: Provides health context based on the current phase of the menstrual cycle.

### 💊 Medication Management
- **Inventory Tracking**: Monitor stock levels and receive refill reminders.
- **Schedule**: Set up dosage frequencies (Daily, Weekly, etc.).
- **Intake Logs**: Track when medications were actually taken.
- **Recommendations**: Integrated drug database for info and dosage guidelines.

### 🚨 Emergency SOS
- **Long-Press Activation**: Prevents accidental triggers while ensuring rapid access.
- **Multi-Action**: Automatically initiates calls to emergency services and primary contacts.
- **Smart Navigation**: Starts background navigation to the nearest hospital.

---

## 4. System Architecture

### Database Schema
- **Users**: Core profile data, auth credentials, and health vitals.
- **Medications**: User-specific prescriptions and intake schedules.
- **Cycle Logs**: Historical data for period tracking.
- **Symptom Logs**: Record of AI analysis results.
- **Sync Meta**: Tracks `synced_at` and `last_modified` timestamps for all synchronized rows.

### Synchronization Flow (`sync_service.py`)
1. **Push**: Identifies rows modified locally (`last_modified > synced_at`) and upserts them to Supabase.
2. **Pull**: Fetches rows from Supabase modified since the last sync and merges them into the local SQLite database.
3. **Initial Pull**: When logging in on a new device, Nexos performs a staged "pull" to restore the user's entire health history.

---

## 5. Security & Authentication
- **JWT Auth**: Stateless authentication using bearer tokens.
- **OTP Verification**: Required for signup, login on new devices, and password resets.
- **Password Hashing**: BCrypt-based hashing for secure credential storage.
- **CORS Policy**: Restrictive origin validation to prevent unauthorized API access.

---

## 6. Environment Setup

### Backend (.env)
```env
DATABASE_URL=sqlite:///./health.db
JWT_SECRET_KEY=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email
SMTP_PASSWORD=your_app_password
SMTP_FROM=your_email
ALLOWED_ORIGINS=https://your-frontend.pages.dev
FRONTEND_URL=https://your-frontend.pages.dev
SYNC_INTERVAL_MINUTES=5
```

### Optional email provider vars
If SMTP is blocked by your host, configure Resend or Brevo so the app can send verification and welcome emails over HTTPS.
```env
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=your_from_address
BREVO_API_KEY=your_brevo_api_key
```

### Optional AI provider var
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.render.com
```

---

## 7. Recent Improvements (May 2026)
- **Branding Refresh**: Full migration to a high-contrast, elite glassmorphic UI.
- **Email Reliability**: Migrated to SSL (Port 465) and synchronous delivery to ensure 100% OTP success rate.
- **Cycle Tracker UX**: Implemented custom duration selection chips and automated date logic.
- **Sync Optimization**: Enhanced "New Device" detection and background data streaming.

---

## 8. Future Roadmap
- **Wearable Integration**: Syncing heart rate and sleep data from Apple Health/Google Fit.
- **Doctor Portal**: Secure dashboard for sharing health history with medical professionals.
- **AI Voice Assistant**: Voice-activated symptom logging and medication reminders.
- **Offline AI**: Local LLM integration for basic symptom analysis without internet.
