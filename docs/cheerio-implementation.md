# Cheerio Implementation Guide

## Overview

Cheerio has been integrated into the web scraping system to provide fast, efficient HTML parsing for extracting structured data from websites. Cheerio is a jQuery-like library for server-side DOM manipulation that's significantly faster than full browser automation for static content.

## What is Cheerio?

**Cheerio** is a fast, flexible, and lean implementation of core jQuery designed specifically for the server. It parses HTML and provides a jQuery-like API for traversing and manipulating the DOM.

### Key Benefits:
- ⚡ **10-50x faster** than browser automation for static sites
- 🔍 **Powerful CSS selectors** for precise element targeting
- 📦 **Lightweight** - minimal memory footprint
- 🎯 **Structured data extraction** - easily parse tables, lists, headings
- 💰 **Cost-effective** - no browser overhead

## Architecture

### Dual-Mode Scraping

The `scrape-website` function now operates in two modes:

```
┌─────────────────────────────────────────┐
│       Has Playwright API Key?           │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
        YES               NO
         │                 │
         ▼                 ▼
  ┌─────────────┐   ┌──────────────┐
  │ Playwright  │   │   Cheerio    │
  │   Mode      │   │    Mode      │
  └─────────────┘   └──────────────┘
         │                 │
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Cheerio Parsing │
         │  (Both Modes)   │
         └─────────────────┘
```

### Mode Selection Logic

1. **Playwright Mode** (JavaScript-heavy sites):
   - Renders page in real browser
   - Executes JavaScript
   - Waits for dynamic content
   - Returns rendered HTML
   - Cheerio then parses the rendered HTML

2. **Cheerio Mode** (Static HTML sites):
   - Direct HTTP fetch
   - No JavaScript execution
   - Faster response time
   - Lower resource usage
   - Direct HTML parsing

## Features Implemented

### 1. Enhanced HTML Parsing

```typescript
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';

const $ = cheerio.load(html);
```

### 2. Metadata Extraction

Extracts all important metadata tags:

```typescript
const metadata = {
  ogTitle: $('meta[property="og:title"]').attr('content'),
  ogDescription: $('meta[property="og:description"]').attr('content'),
  ogImage: $('meta[property="og:image"]').attr('content'),
  description: $('meta[name="description"]').attr('content'),
  keywords: $('meta[name="keywords"]').attr('content'),
  author: $('meta[name="author"]').attr('content'),
  canonical: $('link[rel="canonical"]').attr('href'),
};
```

**Extracted Fields:**
- Open Graph title, description, image
- Meta description
- Keywords
- Author information
- Canonical URL

### 3. Smart Title Detection

Multiple fallback strategies for finding page titles:

```typescript
const title = $('title').text().trim() ||                    // <title> tag
              $('meta[property="og:title"]').attr('content') || // OG title
              $('h1').first().text().trim() || '';             // First H1
```

### 4. Link Extraction with URL Normalization

```typescript
function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    // Skip anchors, mailto, tel
    if (href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')) {
      return;
    }

    // Convert relative URLs to absolute
    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      links.add(absoluteUrl);
    } catch {
      // Invalid URL, skip
    }
  });

  return Array.from(links);
}
```

**Features:**
- Converts relative URLs to absolute
- Filters out anchors, mailto, tel links
- Deduplicates URLs
- Handles malformed URLs gracefully

### 5. Contact Information Extraction

#### Social Media Links

Extracts all social profiles using regex patterns:

```typescript
const socialPatterns = [
  { regex: /https?:\/\/(www\.)?(linkedin\.com\/company\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(linkedin\.com\/in\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(twitter\.com\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(x\.com\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(facebook\.com\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(instagram\.com\/[^\s"'<>]+)/gi },
  { regex: /https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?[^\s"'<>]+)/gi },
];
```

Searches in:
- `<a href>` attributes
- Body text content

#### Email Addresses

Smart email extraction with validation:

```typescript
function extractContactInfo($: cheerio.CheerioAPI) {
  const emails = new Set<string>();

  // Extract from mailto: links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].toLowerCase();
    if (isValidEmail(email)) {
      emails.add(email);
    }
  });

  // Extract from text using regex
  const emailPattern = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  // ...
}
```

**Validation includes:**
- Must contain `@` symbol
- Must have valid domain with TLD
- Filters out image files (.png, .jpg, etc.)
- Removes example domains (example.com, test.com)
- Validates local and domain parts

### 6. Structured Data Extraction

#### Headings Hierarchy

```typescript
$('h1, h2, h3, h4, h5, h6').each((_, el) => {
  const tag = $(el).prop('tagName')?.toLowerCase();
  const level = parseInt(tag?.replace('h', '') || '1');
  const text = $(el).text().trim();
  if (text) {
    headings.push({ level, text });
  }
});
```

**Returns:**
```json
{
  "headings": [
    { "level": 1, "text": "Welcome to Our Company" },
    { "level": 2, "text": "Our Services" },
    { "level": 3, "text": "Web Development" }
  ]
}
```

#### Paragraphs

Extracts meaningful paragraph content:

```typescript
$('p').slice(0, 50).each((_, el) => {
  const text = $(el).text().trim();
  if (text && text.length > 20) {  // Filter short paragraphs
    paragraphs.push(text);
  }
});
```

#### Lists (Bullet Points)

```typescript
$('ul, ol').slice(0, 20).each((_, el) => {
  const items: string[] = [];
  $(el).find('li').each((_, li) => {
    const text = $(li).text().trim();
    if (text) {
      items.push(text);
    }
  });
  if (items.length > 0) {
    lists.push(items);
  }
});
```

**Returns:**
```json
{
  "lists": [
    ["Web Development", "Mobile Apps", "Cloud Services"],
    ["Over 10 years experience", "500+ clients", "99% satisfaction"]
  ]
}
```

#### Tables

Extracts tabular data:

```typescript
$('table').slice(0, 10).each((_, table) => {
  const rows: string[][] = [];
  $(table).find('tr').each((_, tr) => {
    const cells: string[] = [];
    $(tr).find('td, th').each((_, cell) => {
      cells.push($(cell).text().trim());
    });
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  if (rows.length > 0) {
    tables.push(rows);
  }
});
```

**Returns:**
```json
{
  "tables": [
    [
      ["Feature", "Basic", "Pro"],
      ["Users", "5", "Unlimited"],
      ["Storage", "10GB", "1TB"]
    ]
  ]
}
```

### 7. Content Cleaning

Removes unnecessary elements before parsing:

```typescript
// Remove script and style tags
$('script').remove();
$('style').remove();
$('noscript').remove();
```

Extracts clean text:

```typescript
const text = $('body').text()
  .replace(/\s+/g, ' ')  // Normalize whitespace
  .trim()
  .substring(0, 50000);  // Limit size
```

## API Response Structure

### Complete Response Example

```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Company - Web Solutions",
    "content": "Clean text content...",
    "html": "<html>...</html>",
    "text": "Plain text version...",
    "links": [
      "https://example.com/about",
      "https://example.com/services"
    ],
    "socialLinks": [
      "https://linkedin.com/company/example",
      "https://twitter.com/example"
    ],
    "emails": [
      "info@example.com",
      "sales@example.com"
    ],
    "metadata": {
      "ogTitle": "Example Company",
      "ogDescription": "We provide web solutions",
      "ogImage": "https://example.com/og-image.jpg",
      "description": "Leading web solutions provider",
      "keywords": "web, development, solutions",
      "author": "Example Team",
      "canonical": "https://example.com"
    },
    "structuredData": {
      "headings": [
        { "level": 1, "text": "Welcome" },
        { "level": 2, "text": "Our Services" }
      ],
      "paragraphs": [
        "We are a leading provider...",
        "Our team has over 10 years..."
      ],
      "lists": [
        ["Service 1", "Service 2", "Service 3"]
      ],
      "tables": [
        [
          ["Feature", "Value"],
          ["Experience", "10+ years"]
        ]
      ]
    }
  }
}
```

## Performance Comparison

### Cheerio vs Playwright

| Aspect | Cheerio | Playwright |
|--------|---------|------------|
| **Speed** | ~2-3 seconds | ~8-12 seconds |
| **Memory** | ~50MB | ~300MB |
| **JavaScript** | ❌ No | ✅ Yes |
| **Cost** | Free | Paid API |
| **Best For** | Static sites | SPAs, Dynamic content |

### When to Use Each

**Use Cheerio (Default):**
- Static HTML websites
- Blogs, documentation sites
- Content management systems
- Traditional server-rendered sites
- When speed is priority

**Use Playwright:**
- Single Page Applications (React, Vue, Angular)
- Sites with dynamic content loading
- JavaScript-heavy interfaces
- Sites requiring authentication
- AJAX-loaded content

## Integration with AI Extraction

Cheerio-parsed data flows into Perplexity AI for extraction:

```
Cheerio Parsing
    ↓
Structured Data (headings, lists, tables)
    ↓
Combined with raw text
    ↓
Sent to Perplexity AI
    ↓
AI extracts company info, contacts, services
```

### Benefits for AI:

1. **Structured Context**: AI receives organized data (headings, lists)
2. **Better Accuracy**: Clear hierarchy helps AI understand relationships
3. **Faster Processing**: Pre-structured data reduces AI processing time
4. **Reduced Noise**: Cleaned HTML without scripts/styles

## Error Handling

### Graceful Degradation

```typescript
try {
  const absoluteUrl = new URL(href, baseUrl).href;
  links.add(absoluteUrl);
} catch {
  // Invalid URL, skip silently
}
```

### Timeout Protection

```typescript
const response = await fetch(url, {
  signal: AbortSignal.timeout(15000),  // 15 second timeout
});
```

### Validation

```typescript
function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;

  const invalidExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  if (invalidExtensions.some(ext => email.includes(ext))) return false;

  // More validation...
  return true;
}
```

## Usage Examples

### Basic Scraping

```bash
curl -X POST https://your-project.supabase.co/functions/v1/scrape-website \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "includeLinks": true
  }'
```

### With Playwright (if API key configured)

The function automatically uses Playwright if the key is configured, then Cheerio parses the rendered HTML for enhanced extraction.

## Future Enhancements

Potential improvements:

1. **Schema.org Extraction**: Parse JSON-LD structured data
2. **Image Analysis**: Extract alt text, captions
3. **Form Detection**: Identify contact forms
4. **PDF Text Extraction**: Parse embedded PDFs
5. **Video Metadata**: Extract video information
6. **Microdata Parsing**: Parse microdata, microformats
7. **RSS/Atom Feeds**: Detect and parse feeds
8. **Sitemap Discovery**: Find and parse sitemaps

## Troubleshooting

### Issue: "Cheerio is not defined"

**Cause:** Import issue
**Solution:** Ensure import is correct:
```typescript
import * as cheerio from 'npm:cheerio@1.0.0-rc.12';
```

### Issue: "Empty results"

**Cause:** Website uses JavaScript rendering
**Solution:** Add Playwright API key in Settings for JavaScript support

### Issue: "Invalid URLs extracted"

**Cause:** Malformed href attributes
**Solution:** Already handled - invalid URLs are skipped silently

### Issue: "Too many emails extracted"

**Cause:** Email-like patterns in content
**Solution:** Validation filters out invalid patterns automatically

## Best Practices

1. **Always validate extracted data** before using
2. **Use Cheerio for static sites** to save costs and time
3. **Add Playwright key for SPAs** and dynamic sites
4. **Respect rate limits** when crawling multiple pages
5. **Cache results** to avoid repeated scraping
6. **Handle errors gracefully** - some pages may fail

## Conclusion

Cheerio provides a powerful, fast, and cost-effective solution for parsing HTML and extracting structured data from websites. Combined with Playwright for JavaScript-heavy sites, this creates a comprehensive scraping solution that handles virtually any website architecture.

The structured data extraction (headings, lists, tables) significantly improves AI-powered data extraction by providing organized context that Perplexity AI can use to better understand and extract company information.
