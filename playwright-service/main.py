"""
Playwright Web Scraping Service
A Python-based API for web scraping using Playwright
"""
import os
import asyncio
import json
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from playwright.async_api import async_playwright, Browser, Page
import uvicorn

app = FastAPI(title="Playwright Scraping Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
API_KEY = os.getenv("SERVICE_API_KEY", "your-secret-api-key-change-this")
BROWSER_HEADLESS = os.getenv("BROWSER_HEADLESS", "true").lower() == "true"
DEFAULT_TIMEOUT = int(os.getenv("DEFAULT_TIMEOUT", "30000"))

# Global browser instance for reuse
browser: Optional[Browser] = None


class ScrapeRequest(BaseModel):
    url: HttpUrl
    formats: List[str] = ["markdown", "html"]
    wait_for_selector: Optional[str] = None
    wait_for_timeout: Optional[int] = None
    extract_links: bool = False
    extract_images: bool = False
    javascript_enabled: bool = True
    screenshot: bool = False


class ScrapeResponse(BaseModel):
    success: bool
    data: dict
    metadata: dict


async def get_browser() -> Browser:
    """Get or create a browser instance"""
    global browser
    if browser is None or not browser.is_connected():
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(
            headless=BROWSER_HEADLESS,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
            ]
        )
    return browser


async def scrape_page(request: ScrapeRequest) -> dict:
    """Scrape a web page using Playwright"""
    browser = await get_browser()
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    try:
        page = await context.new_page()
        page.set_default_timeout(request.wait_for_timeout or DEFAULT_TIMEOUT)

        # Navigate to the URL
        response = await page.goto(str(request.url), wait_until="networkidle")

        # Wait for specific selector if provided
        if request.wait_for_selector:
            await page.wait_for_selector(request.wait_for_selector, timeout=10000)

        # Extract data based on requested formats
        result = {
            "url": str(request.url),
            "status": response.status if response else None,
        }

        if "html" in request.formats:
            result["html"] = await page.content()

        if "text" in request.formats or "markdown" in request.formats:
            # Get visible text content
            text_content = await page.evaluate("""
                () => {
                    // Remove script and style elements
                    const clone = document.body.cloneNode(true);
                    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
                    return clone.innerText;
                }
            """)
            result["text"] = text_content
            result["markdown"] = text_content  # Simple text for now, can be enhanced

        if request.extract_links:
            links = await page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('a[href]')).map(a => ({
                        text: a.innerText.trim(),
                        href: a.href
                    }));
                }
            """)
            result["links"] = links

        if request.extract_images:
            images = await page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('img[src]')).map(img => ({
                        src: img.src,
                        alt: img.alt || ''
                    }));
                }
            """)
            result["images"] = images

        if request.screenshot:
            screenshot_bytes = await page.screenshot(full_page=True)
            result["screenshot"] = screenshot_bytes.hex()

        # Extract metadata
        metadata = await page.evaluate("""
            () => {
                const meta = {};
                meta.title = document.title;

                // Get meta tags
                document.querySelectorAll('meta').forEach(tag => {
                    const name = tag.getAttribute('name') || tag.getAttribute('property');
                    const content = tag.getAttribute('content');
                    if (name && content) {
                        meta[name] = content;
                    }
                });

                // Get Open Graph data
                meta.ogTitle = document.querySelector('meta[property="og:title"]')?.content;
                meta.ogDescription = document.querySelector('meta[property="og:description"]')?.content;
                meta.ogImage = document.querySelector('meta[property="og:image"]')?.content;

                return meta;
            }
        """)

        return {
            "success": True,
            "data": result,
            "metadata": metadata
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

    finally:
        await context.close()


def verify_api_key(authorization: Optional[str] = Header(None)) -> bool:
    """Verify API key from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    # Expected format: "Bearer <api_key>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    provided_key = authorization.replace("Bearer ", "")
    if provided_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return True


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Playwright Scraping Service",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    browser_status = "connected" if browser and browser.is_connected() else "disconnected"
    return {
        "status": "healthy",
        "browser": browser_status,
        "headless": BROWSER_HEADLESS
    }


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest, _: bool = Header(default=None, alias="Authorization",
                                                           dependency=verify_api_key)):
    """
    Scrape a web page using Playwright

    - **url**: The URL to scrape (required)
    - **formats**: List of formats to return (html, text, markdown)
    - **wait_for_selector**: CSS selector to wait for before scraping
    - **wait_for_timeout**: Maximum time to wait (milliseconds)
    - **extract_links**: Extract all links from the page
    - **extract_images**: Extract all images from the page
    - **javascript_enabled**: Enable JavaScript execution
    - **screenshot**: Capture a screenshot of the page
    """
    try:
        result = await scrape_page(request)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_event():
    """Initialize browser on startup"""
    print("Starting Playwright Scraping Service...")
    await get_browser()
    print("Browser initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Close browser on shutdown"""
    global browser
    if browser:
        await browser.close()
        print("Browser closed")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
