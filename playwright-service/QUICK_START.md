# Quick Start: Python Playwright Service

Get your Playwright web scraping service running in 5 minutes.

## 🚀 Fastest Way: Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Navigate to service directory
cd playwright-service

# 3. Login and deploy
railway login
railway init
railway variables set SERVICE_API_KEY=$(openssl rand -hex 32)
railway up

# 4. Get your URL
railway domain
# Example output: https://playwright-service-production.up.railway.app
```

## 🔧 Configure Supabase

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Add these two secrets:
```
PLAYWRIGHT_SERVICE_URL=https://your-service.railway.app
PLAYWRIGHT_SERVICE_API_KEY=<same-key-you-used-above>
```

## ✅ Test It

```bash
# Test the service directly
curl -X POST https://your-service.railway.app/scrape \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'

# Expected response:
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "status": 200,
    "markdown": "...",
    "html": "..."
  },
  "metadata": {
    "title": "Example Domain"
  }
}
```

## 🎯 Use in Your App

The Edge Function `scrape-with-playwright` is already deployed and ready to use.

**No frontend changes needed!** The new function has the same interface as the old Firecrawl one.

Optionally, update component names from `FirecrawlScraper` to `PlaywrightScraper` or `WebScraper`.

## 📊 Monitor

**Check health:**
```bash
curl https://your-service.railway.app/health
```

**View logs:**
```bash
railway logs
```

## 💰 Cost

**Railway**: ~$5/month for basic usage (500 hours free tier)

## 🆘 Troubleshooting

### "Playwright service not configured"
→ Add `PLAYWRIGHT_SERVICE_URL` to Supabase secrets

### "Playwright API key not configured"
→ Add `PLAYWRIGHT_SERVICE_API_KEY` to Supabase secrets

### Service won't start
→ Check Railway logs: `railway logs`

### Scraping fails
→ Some websites block headless browsers. Try adding `wait_for_selector` parameter.

## 📚 More Info

- Full documentation: See `README.md`
- Integration guide: See `INTEGRATION.md`
- Python code: See `main.py`

---

**That's it!** Your Playwright service is now handling all web scraping requests. 🎉
