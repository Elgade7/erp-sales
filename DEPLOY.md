# ERP Sales - Deployment Guide

## Quick Start

### Local Development
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (terminal 1)
cd backend && node server.js

# Start frontend (terminal 2)
cd frontend && npx vite
```

### Production (Single Server)
```bash
# Build frontend
cd frontend && npm run build

# Start server
cd backend && node server.js
```
Access at http://localhost:3001

---

## Deploy to Cloud (Railway)

1. **Create GitHub Repository**
   - Go to github.com
   - Create new repository "erp-sales"
   - Push this code to GitHub

2. **Deploy on Railway**
   - Go to railway.app
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
   - Set root directory: `backend`
   - Start command: `node server.js`
   - Add environment variable: `PORT=3001`

3. **Access Your ERP**
   - Railway provides a URL like: `https://erp-sales.up.railway.app`

---

## Deploy to Cloud (Render)

1. **Create GitHub Repository**
   - Go to github.com
   - Create new repository "erp-sales"
   - Push this code to GitHub

2. **Deploy on Render**
   - Go to render.com
   - Sign up with GitHub
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Root directory: `backend`
   - Start command: `node server.js`
   - Plan: Free

3. **Access Your ERP**
   - Render provides a URL like: `https://erp-sales.onrender.com`

---

## Database

The database (erp.db) is created automatically on first run.
For cloud deployment, consider using a persistent storage solution:
- Railway: Add a persistent disk or use PostgreSQL
- Render: Use Render's managed PostgreSQL

---

## Features

- Dashboard with sales reports
- Customer management
- Product catalog
- Order tracking
- Blue/white professional design
