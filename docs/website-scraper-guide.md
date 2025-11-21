# Website Scraper Integration Guide

## Overview

The native website scraper has been integrated into the Client Detail module to extract company information, contact details, social media links, and technologies from client websites without any third-party dependencies.

## Features

The scraper extracts:

- **Company Information**: Name, tagline, and description from meta tags and headings
- **Contact Details**: Email addresses and phone numbers found on the page
- **Social Media Links**: LinkedIn, Twitter, Facebook, and Instagram profiles
- **Technologies**: Detected technologies mentioned on the website (React, AWS, Python, etc.)
- **Key Headings**: Main H1 and H2 elements for content overview
- **Links & Images**: Internal and external links, and image URLs

## How to Use

### In Client Detail Page

1. Navigate to any client's detail page
2. Go to the **Settings** tab
3. If the client has a website URL set, you'll see the **Website Scraper** card
4. The scraper will automatically populate with the client's website
5. Click **Scrape** to extract data
6. Results will be displayed and automatically saved to the client record

### Manual URL Entry

You can also enter any URL manually:
- Enter the URL (with or without `https://`)
- Press Enter or click Scrape
- Data will be extracted and displayed

## Edge Function

The scraper uses the `scrape-client-website` edge function which:

- Uses native Deno `fetch()` - no external API keys required
- Parses HTML using `deno-dom` (similar to Cheerio)
- Extracts structured data using regex and DOM queries
- Automatically saves to the `clients.website_data` JSONB field
- Handles authentication and authorization

## Technical Implementation

### Edge Function Location
`/supabase/functions/scrape-client-website/index.ts`

### Database Schema
The scraped data is stored in `clients.website_data` as JSONB with this structure:

```typescript
{
  title: string;
  description: string;
  companyInfo: {
    name?: string;
    tagline?: string;
    description?: string;
  };
  contact: {
    email?: string;
    phone?: string;
  };
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  technologies: string[];
  headings: string[];
  links: string[];
  images: string[];
}
```

### Component Location
`/src/components/client/WebsiteScraper.tsx`

## Benefits

- **No API Keys Required**: Uses native HTTP requests
- **Free**: No usage limits or costs
- **Fast**: Direct HTML parsing without external services
- **Privacy**: All scraping happens on your infrastructure
- **Flexible**: Works with most public websites

## Limitations

- Cannot render JavaScript-heavy websites (use Firecrawl for those)
- May not work with sites that require authentication
- Some sites may block automated requests
- Best for static HTML content

## Example Usage

```typescript
// The scraper is already integrated in ClientDetailNew.tsx
// It appears in the settings tab when client.website is set

// To manually trigger scraping:
const result = await fetch(
  `${SUPABASE_URL}/functions/v1/scrape-client-website`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: 'https://example.com',
      clientId: 'client-uuid'
    }),
  }
);
```
