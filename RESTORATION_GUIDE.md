# Nexos Health — Post-Reinstallation Restoration Guide

Welcome to your fresh Windows environment! This guide will walk you through setting up your development environment and restoring the Nexos Health project to its exact current state in under 10 minutes.

---

## 🛠️ Step 1: Install System Prerequisites

Before doing anything else, download and install the following software on your clean Windows installation:

1. **Git for Windows**: [Download Git](https://git-scm.com/download/win)
2. **Node.js (LTS Version)**: [Download Node.js](https://nodejs.org/) (Includes `npm`)
3. **Python (Version 3.10 or later)**: [Download Python](https://www.python.org/downloads/)
   * ⚠️ **IMPORTANT**: During installation, check the box that says **"Add Python to PATH"**. If you miss this, python commands will not work in your command line.
4. **Visual Studio Code**: [Download VS Code](https://code.visualstudio.com/)
5. *(Optional)* **DB Browser for SQLite**: [Download DB Browser](https://sqlitebrowser.org/) (A great free tool to inspect your SQLite database files visually).

---

## 📂 Step 2: Clone the Project Repository

Open PowerShell or Command Prompt, navigate to the directory where you want to keep your project (e.g., `C:\projects` or `C:\xampp\htdocs`), and clone the repository:

```powershell
# Navigate to your workspace directory
cd C:\xampp\htdocs

# Clone the repository
git clone https://github.com/PrinceFredKent/Nexos.git health

# Enter the project directory
cd health
```

---

## 🔑 Step 3: Restore Local Configurations & Databases

Now we will restore your local database and environment secrets from the backup ZIP file you saved.

1. Locate your **`nexos_reinstall_backup.zip`** file from your USB or cloud storage.
2. Extract the contents directly into your cloned `health` directory.
3. Verify that the files are extracted to these exact paths:
   * 📝 `health/backend/.env`
   * 📝 `health/frontend/.env`
   * 🗄️ `health/backend/health.db`
   * 🗄️ `health/backend/health_assistant.db` *(if present)*

---

## 🐍 Step 4: Configure the Python Backend

We will recreate the virtual environment (`venv`) and install all required Python libraries.

```powershell
# Ensure you are in the backend directory
cd C:\xampp\htdocs\health\backend

# 1. Create a fresh virtual environment
python -m venv venv

# 2. Activate the virtual environment
# Note: If PowerShell blocks execution, run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\venv\Scripts\Activate.ps1

# 3. Install all backend dependencies
pip install -r requirements.txt
```

---

## ⚡ Step 5: Configure the React Frontend

Now we will install all the Node.js modules for the React frontend application.

```powershell
# Navigate to the frontend directory
cd C:\xampp\htdocs\health\frontend

# Install the Node packages
npm install
```

---

## 🚀 Step 6: Verify and Run the Applications

Let's test both components to verify that everything is running perfectly and connected to your database!

### 1. Run the Backend API
In a terminal window (with the Python virtual environment activated):

```powershell
cd C:\xampp\htdocs\health\backend
.\venv\Scripts\Activate.ps1

# Run the FastAPI server
python main.py
```
* **Expected Output**: You should see FastAPI start up on `http://127.0.0.1:8000`. You will also see a message confirming the cloud Supabase connection for background sync is active!

### 2. Run the React Frontend
Open a **new** terminal window and run:

```powershell
cd C:\xampp\htdocs\health\frontend

# Start the Vite development server
npm run dev
```
* **Expected Output**: You should see Vite launch on `http://localhost:5173`. 
* **Action**: Open `http://localhost:5173` in your browser. Verify you can see the glassmorphic login screen, sign in with your usual credentials, and see all your historical health data (symptom logs, medication tracking) fully intact!

---

## 💡 Troubleshooting & Tips

* **PowerShell script execution error**: If you get a script execution policy error when activating the `venv`, run this command in PowerShell first:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
  ```
* **Supabase Connection issues**: If the backend fails to connect to Supabase, check that your computer has an active internet connection. The PostgreSQL database is hosted on the cloud (Supabase), which requires internet connectivity.
* **SQLite locks**: In case you run into a `"database is locked"` error, our SQLite setup automatically has a `timeout=30` connection pool configured, but it is best to avoid running multiple backend processes at the same time.
