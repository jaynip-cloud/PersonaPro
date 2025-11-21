# Integration Guide: Playwright Service with Your App

This guide explains how to integrate the Python Playwright service with your existing application.

## Overview

The Playwright service replaces Firecrawl as your web scraping backend. It provides more control and eliminates dependency on external APIs.

## Architecture

```
Frontend Component → Edge Function → Python Playwright Service → Target Website
      ↓                    ↓                    ↓                        ↓
  User clicks       scrape-with-     Playwright browser          Scraped data
   "Scrape"          playwright       automation                  returned
```

## Setup Steps

### 1. Deploy the Playwright Service

Choose one deployment option:

#### Option A: Railway (Recommended - Easiest)
```bash
cd playwright-service
railway login
railway init
railway variables set SERVICE_API_KEY=$(openssl rand -hex 32)
railway up
railway domain  # Copy this URL
```

#### Option B: Render
1. Create new Web Service
2. Connect repository
3. Set Dockerfile path: `playwright-service/Dockerfile`
4. Add environment variable: `SERVICE_API_KEY`
5. Deploy and copy the URL

#### Option C: Docker on VPS
```bash
cd playwright-service
cp .env.example .env
# Edit .env and set SERVICE_API_KEY
docker-compose up -d
# Use your server IP:8000 as the URL
```

### 2. Configure Supabase Environment Variables

Add these to your Supabase project (Dashboard → Project Settings → Edge Functions):

```bash
PLAYWRIGHT_SERVICE_URL=https://your-service.railway.app
PLAYWRIGHT_SERVICE_API_KEY=your-secure-api-key
```

**Important**: Use the same API key you set when deploying the service.

### 3. Update Frontend Components

The following components need to be updated to use the new Playwright service:

#### A. Update FirecrawlScraper Component

**File**: `src/components/knowledge/FirecrawlScraper.tsx`

Replace the edge function call:

```typescript
// OLD (Firecrawl)
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-with-firecrawl`,
  { /* ... */ }
);

// NEW (Playwright)
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-with-playwright`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: websiteUrl,
      formats: ['markdown', 'html'],
      extract_links: true,
      extract_images: false,
    }),
  }
);
```

#### B. Rename Component (Optional)

Consider renaming `FirecrawlScraper.tsx` to `PlaywrightScraper.tsx` or `WebScraper.tsx` for clarity.

#### C. Update AI Extractors

Update these components to use Playwright instead of Firecrawl:
- `src/components/knowledge/AIServiceExtractor.tsx`
- `src/components/knowledge/AIBlogExtractor.tsx`
- `src/components/knowledge/AITechnologyExtractor.tsx`

Replace all instances of:
```typescript
scrape-with-firecrawl → scrape-with-playwright
```

### 4. Update Settings Page (Optional)

Add Playwright API Key field to Settings:

**File**: `src/pages/Settings.tsx`

Add new state:
```typescript
const [playwrightApiKey, setPlaywrightApiKey] = useState('');
```

Load it:
```typescript
const { data: apiKeys } = await supabase
  .from('api_keys')
  .select('openai_api_key, perplexity_api_key, playwright_api_key')
  .eq('user_id', user.id)
  .maybeSingle();

setPlaywrightApiKey(apiKeys?.playwright_api_key || '');
```

Save it:
```typescript
await supabase
  .from('api_keys')
  .update({
    playwright_api_key: playwrightApiKey,
    updated_at: new Date().toISOString()
  })
  .eq('user_id', user.id);
```

Add input field in the UI:
```tsx
<div>
  <label className="block text-sm font-medium text-foreground mb-2">
    Playwright API Key (Optional)
  </label>
  <Input
    type="password"
    value={playwrightApiKey}
    onChange={(e) => setPlaywrightApiKey(e.target.value)}
    placeholder="Leave empty to use default service"
  />
  <p className="text-xs text-muted-foreground mt-1">
    Only needed if you're running your own Playwright service
  </p>
</div>
```

### 5. Test the Integration

1. **Test the service directly**:
```bash
curl -X POST https://your-service.railway.app/scrape \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
```

2. **Test via Edge Function**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scrape-with-playwright \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

3. **Test in the UI**:
   - Go to Knowledge Base → Data Enrichment tab
   - Click "Web Scraper" section
   - Enter a URL and click "Scrape"
   - Verify data is extracted correctly

## Advanced Configuration

### Custom Wait Selectors

For JavaScript-heavy sites, you can wait for specific elements:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-with-playwright`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: websiteUrl,
      formats: ['markdown'],
      wait_for_selector: '.main-content',  // Wait for this CSS selector
      extract_links: true,
    }),
  }
);
```

### Extract Links and Images

```typescript
body: JSON.stringify({
  url: websiteUrl,
  formats: ['markdown', 'html'],
  extract_links: true,   // Get all links
  extract_images: true,  // Get all images
})
```

### Capture Screenshots

```typescript
body: JSON.stringify({
  url: websiteUrl,
  formats: ['markdown'],
  screenshot: true,  // Returns base64 screenshot
})
```

## Monitoring and Maintenance

### Check Service Health

```bash
# Direct service check
curl https://your-service.railway.app/health

# Expected response:
{
  "status": "healthy",
  "browser": "connected",
  "headless": true
}
```

### View Logs

**Railway**:
```bash
railway logs
```

**Docker**:
```bash
docker-compose logs -f playwright-service
```

**Render**:
Check the Logs tab in Render dashboard

### Common Issues

1. **"Playwright service not configured"**
   - Add PLAYWRIGHT_SERVICE_URL to Supabase environment variables

2. **"Playwright API key not configured"**
   - Add PLAYWRIGHT_SERVICE_API_KEY to Supabase environment variables

3. **"Scraping failed" or timeout errors**
   - Website may be blocking headless browsers
   - Try increasing timeout or using wait_for_selector
   - Check if the site requires authentication

4. **Service is slow or timing out**
   - Increase memory allocation in deployment settings
   - Consider scaling to multiple instances
   - Reduce concurrent scraping operations

## Migration from Firecrawl

To fully migrate from Firecrawl:

1. ✅ Deploy Playwright service
2. ✅ Configure environment variables
3. ✅ Update edge function calls (change function name)
4. ✅ Test all scraping features
5. Remove Firecrawl API key from Settings (optional)
6. Remove `scrape-with-firecrawl` edge function (optional)

## Cost Comparison

**Firecrawl**:
- ~$0.10 per 1000 pages
- External dependency
- Limited control

**Playwright Service**:
- Fixed hosting cost (~$5-20/month depending on provider)
- Full control
- No per-request fees
- Better for high volume

## Security Notes

- Never commit API keys to Git
- Use environment variables for all secrets
- Rotate API keys periodically
- Use HTTPS in production (automatically provided by Railway/Render)
- Consider implementing rate limiting for production

## Support

If you encounter issues:
1. Check service logs for errors
2. Verify environment variables are set correctly
3. Test the service directly before debugging Edge Functions
4. Ensure the service is accessible from Supabase Edge Functions (no firewall blocking)

## Next Steps

After integration:
1. Remove references to Firecrawl in your codebase
2. Update documentation
3. Consider adding retry logic for failed scrapes
4. Implement caching for frequently scraped URLs
5. Add monitoring/alerting for service uptime
