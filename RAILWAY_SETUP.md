# Railway Migration Guide

## Setup Steps

### 1. Create a Railway Account & Project
- Go to https://railway.app
- Sign up or log in
- Create a new project

### 2. Connect Your GitHub Repository
- In Railway: **New Project** → **GitHub Repo** → Select your health repo
- Grant Railway access to your repository

### 3. Set Environment Variables in Railway Dashboard

Once the project is created, go to **Variables** and add:

```
DATABASE_URL=<your_supabase_postgres_url>
JWT_SECRET_KEY=<generate_a_random_secret>
GOOGLE_CLIENT_ID=<from_google_console>
GOOGLE_CLIENT_SECRET=<from_google_console>

# SMTP - Now works on Railway!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your_gmail@gmail.com>
SMTP_PASSWORD=<your_gmail_app_password>
SMTP_FROM=<sender_email@gmail.com>

# Fallback HTTP Email APIs (optional but recommended)
RESEND_API_KEY=<from_resend.com>
RESEND_FROM=onboarding@resend.dev

BREVO_API_KEY=<from_brevo.com>

SYNC_INTERVAL_MINUTES=10
FRONTEND_URL=https://nexos-murex.vercel.app
```

### 4. Deploy
- Railway will automatically deploy when you push to main
- Or manually trigger a deploy from the Railway dashboard

### 5. Get Your Railway Service URL
- Once deployed, Railway assigns a public URL (usually `https://yourapp-production.up.railway.app`)
- Copy this URL

### 6. Update Frontend Config
- In `frontend/src/config.js`, replace the API_BASE_URL with your Railway URL:
```javascript
: "https://your-railway-service-url.up.railway.app";
```

### 7. Redeploy Frontend on Vercel
- Push the updated config to main
- Vercel will auto-redeploy with the new API URL

## Testing

1. Local: `http://localhost:5173` → `http://localhost:8000`
2. Production: `https://nexos-murex.vercel.app` → `https://your-railway-url.up.railway.app`
3. Test OTP/email signup — should now work via SMTP on Railway

## Gmail App Password Setup (if using Gmail SMTP)

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Generate an **App Password** for Mail
4. Use this password as `SMTP_PASSWORD` in Railway

## Troubleshooting

- **Build fails**: Check `Dockerfile` and ensure backend dependencies are in `requirements-render.txt`
- **No emails**: Check Railway logs for SMTP connection errors
- **API not reachable**: Verify Railway service is running and endpoint in frontend config is correct
