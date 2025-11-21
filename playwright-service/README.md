# Playwright Web Scraping Service

A Python-based web scraping service using Playwright for full browser automation. This service provides a REST API that can be used by your Supabase Edge Functions to scrape websites with JavaScript support.

## Features

- **Full Browser Automation**: Uses Playwright with Chromium for JavaScript-heavy websites
- **Multiple Output Formats**: HTML, text, markdown
- **Advanced Extraction**: Links, images, metadata, screenshots
- **Custom Selectors**: Wait for specific elements before scraping
- **Authentication**: Bearer token authentication
- **Health Checks**: Built-in health monitoring endpoints
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Architecture

```
User Browser → Edge Function → Playwright Service → Website
                    ↓              (Python/FastAPI)     ↓
                Database ←────── Scraped Data ──────────┘
```

## Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (recommended)
- OR Python virtual environment

### Option 1: Docker Compose (Recommended)

1. **Copy environment file**:
```bash
cd playwright-service
cp .env.example .env
```

2. **Edit `.env` and set a secure API key**:
```bash
SERVICE_API_KEY=your-very-secure-random-api-key-here
```

3. **Build and run**:
```bash
docker-compose up -d
```

4. **Verify it's running**:
```bash
curl http://localhost:8000/health
```

### Option 2: Local Development

1. **Create virtual environment**:
```bash
cd playwright-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
playwright install chromium
```

3. **Set environment variables**:
```bash
export SERVICE_API_KEY="your-secure-api-key"
export BROWSER_HEADLESS=true
```

4. **Run the service**:
```bash
python main.py
```

## Deployment

### Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add environment variables:
```bash
railway variables set SERVICE_API_KEY=your-secure-api-key
railway variables set BROWSER_HEADLESS=true
railway variables set DEFAULT_TIMEOUT=30000
```

4. Deploy:
```bash
railway up
```

5. Get your service URL:
```bash
railway domain
```

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use these settings:
   - **Environment**: Docker
   - **Dockerfile Path**: `playwright-service/Dockerfile`
   - **Health Check Path**: `/health`
4. Add environment variables:
   - `SERVICE_API_KEY`: Your secure API key
   - `BROWSER_HEADLESS`: `true`
   - `DEFAULT_TIMEOUT`: `30000`

### Deploy to Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login and launch:
```bash
cd playwright-service
fly auth login
fly launch
```

3. Set environment variables:
```bash
fly secrets set SERVICE_API_KEY=your-secure-api-key
```

4. Deploy:
```bash
fly deploy
```

### Deploy to Your Own VPS

1. **SSH into your server**
2. **Install Docker and Docker Compose**
3. **Clone your repository**
4. **Copy and configure `.env`**
5. **Run with Docker Compose**:
```bash
docker-compose up -d
```

6. **Set up reverse proxy** (nginx example):
```nginx
server {
    listen 80;
    server_name playwright.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVICE_API_KEY` | API key for authentication | `your-secret-api-key-change-this` |
| `BROWSER_HEADLESS` | Run browser in headless mode | `true` |
| `DEFAULT_TIMEOUT` | Default timeout in milliseconds | `30000` |
| `PORT` | Server port | `8000` |

### Supabase Configuration

After deploying your Playwright service, update your Supabase project:

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions**
2. Add these secrets:
   - `PLAYWRIGHT_SERVICE_URL`: Your deployed service URL (e.g., `https://your-service.railway.app`)
   - `PLAYWRIGHT_SERVICE_API_KEY`: The same API key you used for the service

Alternatively, users can add their own API key in **Settings** → **API Keys** → **Playwright API Key**

## API Usage

### Authentication

All requests require a Bearer token:
```bash
Authorization: Bearer your-api-key-here
```

### Endpoints

#### `GET /health`
Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "browser": "connected",
  "headless": true
}
```

#### `POST /scrape`
Scrape a web page

**Request Body**:
```json
{
  "url": "https://example.com",
  "formats": ["markdown", "html"],
  "wait_for_selector": ".content",
  "extract_links": true,
  "extract_images": true,
  "screenshot": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "status": 200,
    "html": "<html>...</html>",
    "text": "...",
    "markdown": "...",
    "links": [...],
    "images": [...]
  },
  "metadata": {
    "title": "Example Domain",
    "ogTitle": "...",
    "ogDescription": "..."
  }
}
```

### Example Request

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "html"],
    "extract_links": true
  }'
```

## Integration with Edge Functions

Your Edge Function (`scrape-with-playwright`) is already configured to call this service:

```typescript
const response = await fetch(`${playwrightServiceUrl}/scrape`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${playwrightApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: targetUrl,
    formats: ['markdown', 'html'],
    extract_links: true,
  }),
});
```

## Monitoring

### View Logs (Docker Compose)
```bash
docker-compose logs -f playwright-service
```

### View Logs (Railway)
```bash
railway logs
```

### Resource Usage
The service uses approximately:
- **Memory**: 1-2GB (depending on page complexity)
- **CPU**: 1-2 cores (during active scraping)

## Troubleshooting

### Service won't start
- Check if port 8000 is available
- Verify environment variables are set
- Check Docker logs: `docker-compose logs`

### Scraping fails
- Verify the target URL is accessible
- Check if the website blocks headless browsers
- Increase `wait_for_timeout` for slow websites
- Try using `wait_for_selector` to wait for specific elements

### Out of memory errors
- Increase Docker memory limit in `docker-compose.yml`
- Reduce concurrent scraping requests
- Close browser contexts properly

### Authentication errors
- Verify API key is correct
- Check Authorization header format: `Bearer <key>`
- Ensure PLAYWRIGHT_SERVICE_API_KEY is set in Supabase

## Security Considerations

1. **Never expose your API key** in client-side code
2. **Use HTTPS** in production (not HTTP)
3. **Rotate API keys** regularly
4. **Implement rate limiting** for production use
5. **Use strong, random API keys** (32+ characters)
6. **Run in isolated environment** (containers recommended)

## Performance Tips

1. **Reuse browser instances** (already implemented)
2. **Use headless mode** in production
3. **Set appropriate timeouts** to avoid hanging requests
4. **Consider caching** scraped data when appropriate
5. **Monitor memory usage** and restart service if needed

## Maintenance

### Update Playwright
```bash
# In Docker
docker-compose build --no-cache
docker-compose up -d

# Locally
pip install --upgrade playwright
playwright install chromium
```

### Restart Service
```bash
# Docker Compose
docker-compose restart

# Railway
railway restart

# Systemd
sudo systemctl restart playwright-service
```

## License

This service is part of your project and follows your project's license.

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure the service is accessible from your Edge Functions
4. Test the service directly with curl before debugging Edge Functions
