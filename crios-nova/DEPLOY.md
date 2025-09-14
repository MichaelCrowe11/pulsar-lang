# CRIOS NOVA - Production Deployment Guide

## Quick Deploy Options

### Option 1: Deploy to Fly.io (Recommended - Free Tier)
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly
fly auth login

# Launch app (first time)
fly launch

# Deploy updates
fly deploy
```

### Option 2: Deploy to Render.com (Free Tier)
1. Push code to GitHub
2. Connect GitHub repo at https://render.com
3. Select "New Web Service"
4. Render will auto-detect render.yaml config

### Option 3: Deploy to Railway (One-Click)
1. Push code to GitHub
2. Visit https://railway.app
3. Click "Deploy from GitHub"
4. Railway will use railway.json config

### Option 4: Deploy with Docker (Any Cloud)
```bash
# Build image
docker build -t crios-nova:latest .

# Run locally
docker run -p 8080:8080 --env-file .env.production crios-nova:latest

# Push to registry
docker tag crios-nova:latest your-registry/crios-nova:latest
docker push your-registry/crios-nova:latest
```

### Option 5: Deploy to Heroku
```bash
# Create Heroku app
heroku create crios-nova

# Deploy
git push heroku main

# Open app
heroku open
```

## Environment Variables
Set these in your cloud platform:
- `NODE_ENV=production`
- `PORT=8080`
- `WEBHOOK_SECRET=your-secret-key`
- `ALLOWED_ORIGINS=https://your-domain.com`

## Post-Deployment Checklist
- [ ] Verify health endpoint: https://your-app.com/health
- [ ] Test webhook endpoint with curl
- [ ] Check logs for any errors
- [ ] Set up monitoring/alerts
- [ ] Configure custom domain (optional)

## Monitoring
Access logs:
- Fly.io: `fly logs`
- Render: Dashboard logs tab
- Railway: Dashboard logs view
- Heroku: `heroku logs --tail`