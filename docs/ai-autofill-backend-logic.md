# AI Autofill Backend Logic - Complete Flow

## Overview

When a user clicks **"AI Autofill from URL"** in the Add Client form, a sophisticated multi-step process extracts company data from websites and automatically populates form fields.

## Step-by-Step Backend Flow

### Step 1: Frontend Trigger (AddClient.tsx)

**Location:** `/src/pages/AddClient.tsx` - `handleAIPrefill()` function (lines 303-486)

```typescript
const handleAIPrefill = async () => {
  // 1. Get URL from either website or LinkedIn field
  const urlToExtract = formData.website || formData.linkedinUrl;

  // 2. Validate URL exists
  if (!urlToExtract || !user) {
    showToast('error', 'Please enter a website URL or LinkedIn URL first');
    return;
  }

  // 3. Call edge function
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/extract-company-data`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: urlToExtract })
    }
  );

  // 4. Process response and update form...
};
```

**What happens:**
1. Gets URL from `website` or `linkedinUrl` field
2. Validates URL exists and user is authenticated
3. Shows loading state (`setAiPrefilling(true)`)
4. Calls `extract-company-data` edge function
5. Waits for response
6. Maps extracted data to form fields
7. Updates form state with new data
8. Shows success toast with extraction stats

---

### Step 2: Main Orchestrator Function

**Location:** `supabase/functions/extract-company-data/index.ts`

**Entry Point:**
```typescript
Deno.serve(async (req: Request) => {
  const { url, perplexityKey } = await req.json();

  // Check if LinkedIn URL
  const isLinkedInUrl = url.includes('linkedin.com/company/') ||
                        url.includes('linkedin.com/in/');

  if (isLinkedInUrl) {
    // LinkedIn-specific extraction
    extractedInfo = await extractFromLinkedInUrl(url, perplexityKey);
  } else {
    // Regular website extraction
    crawledData = await crawlWebsite(url, authHeader);
    extractedInfo = await extractCompanyInfo(crawledData, perplexityKey, url);
  }

  // Format and return structured data
  return simplifiedData;
});
```

**Decision Tree:**

```
URL Input
    |
    ├─ Is LinkedIn URL?
    |       |
    |       ├─ YES → extractFromLinkedInUrl()
    |       |           └─ Perplexity AI extracts from LinkedIn
    |       |
    |       └─ NO → Regular website flow:
    |                   |
    |                   ├─ crawlWebsite(url)
    |                   |      └─ Calls crawl-website function
    |                   |
    |                   └─ extractCompanyInfo(crawledData)
    |                          └─ Perplexity AI extracts from pages
    |
    └─ Return structured JSON
```

---

### Step 3: Website Crawling

**Location:** `supabase/functions/crawl-website/index.ts`

**Purpose:** Scrape multiple pages from the website in parallel

```typescript
async function crawlWebsite(
  startUrl: string,
  maxPages: number = 15,
  targetPages: string[]
) {
  // 1. Build list of URLs to crawl
  const urlsToFetch = [
    startUrl,
    startUrl + '/about',
    startUrl + '/contact',
    startUrl + '/team',
    startUrl + '/services',
    startUrl + '/blog',
    startUrl + '/news',
    // ... and more
  ];

  // 2. Crawl pages in batches (5 at a time)
  for (const batch of batches) {
    const promises = batch.map(url =>
      fetch(`/functions/v1/scrape-website`, {
        method: 'POST',
        body: JSON.stringify({ url })
      })
    );

    const results = await Promise.all(promises);
    pages.push(...results);
  }

  // 3. Aggregate results
  return {
    pages: [...],
    summary: {
      totalPages: pages.length,
      uniqueEmails: [...],
      uniqueSocialLinks: [...]
    }
  };
}
```

**Target Pages Crawled:**
- Homepage (`/`)
- `/about`, `/about-us`
- `/contact`
- `/team`, `/leadership`
- `/services`, `/products`, `/solutions`
- `/blog`, `/news`, `/press`
- `/case-studies`, `/testimonials`
- `/technology`, `/partners`
- And 10+ more

**Performance:**
- Processes **up to 15 pages** per website
- **Batch size:** 5 pages at a time (parallel)
- **Total time:** ~10-30 seconds

---

### Step 4: Single Page Scraping

**Location:** `supabase/functions/scrape-website/index.ts`

**Purpose:** Extract data from a single web page using Cheerio

```typescript
async function scrapeWithCheerio(url: string) {
  // 1. Fetch HTML with realistic browser headers
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
      "Accept": "text/html,application/xhtml+xml,...",
      "Accept-Language": "en-US,en;q=0.9",
      // More headers to appear as real browser
    }
  });

  // 2. Parse HTML with Cheerio
  const $ = cheerio.load(html);

  // 3. Remove unwanted elements
  $('script').remove();
  $('style').remove();
  $('noscript').remove();

  // 4. Extract metadata
  const metadata = {
    ogTitle: $('meta[property="og:title"]').attr('content'),
    ogDescription: $('meta[property="og:description"]').attr('content'),
    description: $('meta[name="description"]').attr('content'),
    keywords: $('meta[name="keywords"]').attr('content'),
    // ... more metadata
  };

  // 5. Extract contact information
  const { socialLinks, emails } = extractContactInfo($);

  // 6. Extract structured data
  const structuredData = {
    headings: extractHeadings($),      // H1-H6 with hierarchy
    paragraphs: extractParagraphs($),  // Meaningful text
    lists: extractLists($),            // Bullet points
    tables: extractTables($),          // Table data
  };

  // 7. Extract links
  const links = extractLinks($, url);

  // 8. Return all extracted data
  return {
    url,
    title,
    content,
    html,
    text,
    links,
    socialLinks,
    emails,
    metadata,
    structuredData
  };
}
```

**What Gets Extracted:**

1. **Metadata:**
   - Page title
   - Open Graph tags (og:title, og:description, og:image)
   - Meta description
   - Keywords
   - Author
   - Canonical URL

2. **Contact Information:**
   - Email addresses (validated, filtered)
   - Social media profiles:
     - LinkedIn (company + personal)
     - Twitter/X
     - Facebook
     - Instagram
     - YouTube

3. **Structured Data:**
   - **Headings**: H1-H6 with hierarchy levels
   - **Paragraphs**: Text content (>20 chars)
   - **Lists**: Bullet points, numbered lists
   - **Tables**: Full table data

4. **Links:**
   - All internal/external links
   - Converted to absolute URLs
   - Filtered (no anchors, mailto, tel)

5. **Clean Text:**
   - Body text without scripts/styles
   - Normalized whitespace
   - Limited to 50KB

**Key Functions:**

```typescript
// Extract social media links
function extractContactInfo($: cheerio.CheerioAPI) {
  // Searches for LinkedIn, Twitter, Facebook, Instagram, YouTube
  // Returns validated social links and emails
}

// Extract emails with validation
function isValidEmail(email: string): boolean {
  // Must contain @
  // Must have valid domain
  // Filters out images (.png, .jpg)
  // Removes example domains
}

// Extract structured data
function extractStructuredData($: cheerio.CheerioAPI) {
  // Headings: $('h1, h2, h3, h4, h5, h6')
  // Paragraphs: $('p') with length > 20
  // Lists: $('ul, ol').find('li')
  // Tables: $('table').find('tr').find('td, th')
}
```

---

### Step 5: AI-Powered Data Extraction

**Location:** `supabase/functions/extract-company-data/index.ts` - `extractCompanyInfo()`

**Purpose:** Use Perplexity AI to extract structured company data from crawled content

```typescript
async function extractCompanyInfo(
  crawlResults: CrawlResult[],
  perplexityKey: string,
  rootUrl: string
) {
  // 1. Aggregate data from all pages
  const allEmails = new Set<string>();
  const allSocialLinks = new Set<string>();

  crawlResults.forEach(result => {
    result.emails?.forEach(email => allEmails.add(email));
    result.socialLinks.forEach(link => allSocialLinks.add(link));
  });

  // 2. Combine content from all pages
  const combinedContent = crawlResults
    .map(r => `
      PAGE: ${r.title}
      URL: ${r.url}
      EMAILS FOUND: ${r.emails?.join(', ')}
      CONTENT: ${r.content.substring(0, 12000)}
    `)
    .join('\n---\n\n');

  // 3. Build comprehensive prompt for AI
  const prompt = `
    You are an expert business intelligence analyst.

    Extract COMPREHENSIVE company information from this website:

    ROOT DOMAIN: ${rootUrl}

    DISCOVERED EMAILS: ${Array.from(allEmails).join(', ')}
    DISCOVERED SOCIAL PROFILES:
    - LinkedIn: ${linkedinUrls.join(', ')}
    - Twitter: ${twitterUrls.join(', ')}

    WEBSITE CONTENT FROM MULTIPLE PAGES:
    ${combinedContent}

    REQUIRED EXTRACTION:
    1. Company basics (name, industry, size, location)
    2. Contact information (emails, phones, address with zip)
    3. Leadership team (CEO, founders, key people)
    4. Services/products (all offerings)
    5. Technology stack (if tech company)
    6. Blog articles (if blog exists)
    7. Business goals (short-term, long-term)
    8. Testimonials (client feedback)
    9. Recent news (search web)

    Return ONLY valid JSON with this structure:
    {
      "companyInfo": { ... },
      "contactInfo": { ... },
      "leadership": { ... },
      "contacts": [ ... ],
      "services": [ ... ],
      "blogs": [ ... ],
      "technology": { ... },
      "challenges": [ ... ],
      "competitors": [ ... ],
      "businessInfo": { ... },
      "testimonials": [ ... ],
      "recentNews": [ ... ],
      "socialProfiles": { ... }
    }
  `;

  // 4. Call Perplexity AI
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${perplexityKey}`,
    },
    body: JSON.stringify({
      model: "sonar",  // Perplexity's web-search model
      messages: [
        {
          role: "system",
          content: "You are an expert business intelligence analyst..."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,   // Low temperature for accuracy
      max_tokens: 4000,
    }),
  });

  // 5. Parse AI response
  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  // 6. Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const extractedData = JSON.parse(jsonMatch[0]);

  // 7. Return structured data
  return extractedData;
}
```

**What Perplexity AI Does:**

1. **Analyzes all crawled pages** (up to 15 pages)
2. **Performs web search** to supplement missing data
3. **Extracts structured information:**
   - Company name, industry, size, location
   - Contact emails, phones (validates from discovered list)
   - Leadership team (from team pages, LinkedIn)
   - Services/products (from services pages)
   - Technology stack (from job postings, partners page)
   - Blog articles (from blog page)
   - Business goals (from about page, news)
   - Testimonials (from testimonial pages)
4. **Web search for:**
   - Recent news about company
   - CEO/founder information
   - Funding status
   - Market position
5. **Returns JSON** with all extracted data

**AI Prompt Strategy:**

The prompt is **extremely detailed** (~1500 lines) and includes:
- Data source priority (LinkedIn > Website > Web search)
- Extraction rules for each field type
- Validation requirements
- Examples of correct extraction
- Mandatory vs optional fields
- Accuracy guidelines (never guess, verify sources)

---

### Step 6: Data Formatting & Response

**Location:** `supabase/functions/extract-company-data/index.ts`

```typescript
const simplifiedData = {
  success: true,
  data: {
    // Basic company info
    name: extractedInfo.companyInfo?.name || '',
    industry: extractedInfo.companyInfo?.industry || '',
    description: extractedInfo.companyInfo?.description || '',
    founded: extractedInfo.companyInfo?.founded || '',
    companySize: extractedInfo.companyInfo?.size || '',

    // Location
    location: {
      city: extractLocationCity(extractedInfo.companyInfo?.location),
      country: extractLocationCountry(extractedInfo.companyInfo?.location),
      zipCode: extractedInfo.companyInfo?.zipCode || '',
    },

    // Business information
    businessInfo: {
      mission: extractedInfo.companyInfo?.mission || '',
      vision: extractedInfo.companyInfo?.vision || '',
      shortTermGoals: extractedInfo.businessInfo?.shortTermGoals || '',
      longTermGoals: extractedInfo.businessInfo?.longTermGoals || '',
      expectations: extractedInfo.businessInfo?.expectations || '',
    },

    // Contact information
    contactInfo: {
      contactName: extractedInfo.leadership?.primaryContact?.name || '',
      jobTitle: extractedInfo.leadership?.primaryContact?.title || '',
      primaryEmail: extractedInfo.contactInfo?.primaryEmail || '',
      alternateEmail: extractedInfo.contactInfo?.alternateEmail || '',
      primaryPhone: extractedInfo.contactInfo?.primaryPhone || '',
      alternatePhone: extractedInfo.contactInfo?.alternatePhone || '',
      address: extractedInfo.contactInfo?.address || '',
    },

    // Lists of complex data
    contacts: extractedInfo.contacts || [],
    services: extractedInfo.services || [],
    blogs: extractedInfo.blogs || [],
    technology: {
      stack: extractedInfo.technology?.stack || [],
      partners: extractedInfo.technology?.partners || [],
      integrations: extractedInfo.technology?.integrations || []
    },
    challenges: extractedInfo.challenges || [],
    competitors: extractedInfo.competitors || [],
    testimonials: extractedInfo.testimonials || [],
    recentNews: extractedInfo.recentNews || [],

    // Social profiles
    socialProfiles: {
      linkedin: extractedInfo.socialProfiles?.linkedin || '',
      twitter: extractedInfo.socialProfiles?.twitter || '',
      facebook: extractedInfo.socialProfiles?.facebook || '',
      instagram: extractedInfo.socialProfiles?.instagram || '',
    },

    // Logo
    logo: findLogoUrl(crawledData),
  }
};

return new Response(JSON.stringify(simplifiedData));
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "name": "Company Name",
    "industry": "Technology",
    "companySize": "51-200 employees",
    "founded": "2015",
    "location": {
      "city": "San Francisco",
      "country": "United States",
      "zipCode": "94102"
    },
    "contactInfo": {
      "primaryEmail": "info@company.com",
      "primaryPhone": "+1-555-0123",
      "address": "123 Main St, San Francisco, CA 94102"
    },
    "services": [
      {
        "name": "Web Development",
        "description": "Full-stack web development services"
      }
    ],
    "technologies": {
      "stack": ["React", "Node.js", "PostgreSQL"],
      "partners": ["AWS", "Google Cloud"],
      "integrations": ["Stripe", "Salesforce"]
    },
    "blogs": [
      {
        "title": "How We Scale",
        "url": "https://company.com/blog/scaling",
        "date": "2024-11-15"
      }
    ],
    "socialProfiles": {
      "linkedin": "https://linkedin.com/company/example",
      "twitter": "https://twitter.com/example"
    }
  }
}
```

---

### Step 7: Frontend Data Mapping

**Location:** `/src/pages/AddClient.tsx` - `handleAIPrefill()` response handler

```typescript
if (data.success && data.data) {
  const updates: Partial<ClientFormData> = {};

  // Map basic fields
  if (data.data.name) updates.company = data.data.name;
  if (data.data.industry) updates.industry = data.data.industry;
  if (data.data.founded) updates.founded = data.data.founded;
  if (data.data.companySize) updates.companySize = data.data.companySize;

  // Map location
  if (data.data.location?.city) updates.city = data.data.location.city;
  if (data.data.location?.country) updates.country = data.data.location.country;
  if (data.data.location?.zipCode) updates.zipCode = data.data.location.zipCode;

  // Map contact info
  if (data.data.contactInfo?.contactName) updates.contactName = data.data.contactInfo.contactName;
  if (data.data.contactInfo?.primaryEmail) updates.primaryEmail = data.data.contactInfo.primaryEmail;
  if (data.data.contactInfo?.primaryPhone) updates.primaryPhone = data.data.contactInfo.primaryPhone;

  // Map business goals
  if (data.data.businessInfo?.shortTermGoals) updates.shortTermGoals = data.data.businessInfo.shortTermGoals;
  if (data.data.businessInfo?.longTermGoals) updates.longTermGoals = data.data.businessInfo.longTermGoals;

  // Map social profiles
  if (data.data.socialProfiles?.linkedin) updates.linkedinUrl = data.data.socialProfiles.linkedin;
  if (data.data.socialProfiles?.twitter) updates.twitterUrl = data.data.socialProfiles.twitter;

  // Map arrays
  if (data.data.services?.length > 0) {
    updates.services = data.data.services.map(s => ({
      name: s.name,
      description: s.description
    }));
  }

  if (data.data.technology?.stack?.length > 0) {
    updates.technologies = data.data.technology.stack.map(tech => ({
      name: typeof tech === 'string' ? tech : tech.name,
      category: typeof tech === 'string' ? 'General' : tech.category
    }));
  }

  if (data.data.blogs?.length > 0) {
    updates.blogs = data.data.blogs.map(blog => ({
      title: blog.title,
      url: blog.url,
      date: blog.date
    }));
  }

  // Update form state
  setFormData({ ...formData, ...updates });

  // Show success message
  showToast('success', `Successfully extracted ${Object.keys(updates).length} fields!`);
}
```

**Fields Auto-Populated:**

✅ **Basic Information:**
- Company name
- Industry
- Founded year
- Company size
- Employee count

✅ **Location:**
- City
- Country
- Zip/Postal code

✅ **Contact Information:**
- Contact name
- Job title
- Primary email
- Alternate email
- Primary phone
- Alternate phone

✅ **Business Goals:**
- Short-term goals
- Long-term goals
- Expectations

✅ **Social Profiles:**
- LinkedIn URL
- Twitter URL
- Facebook URL
- Instagram URL

✅ **Logo:**
- Company logo URL

✅ **Complex Data (Arrays):**
- Services (name + description)
- Technologies (name + category)
- Blog articles (title + URL + date)
- Pain points
- Competitors (name + comparison)

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  1. USER CLICKS "AI AUTOFILL FROM URL"              │
│     (AddClient.tsx - handleAIPrefill)               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  2. CALL: /functions/v1/extract-company-data        │
│     POST { url: "https://example.com" }             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  3. EXTRACT-COMPANY-DATA FUNCTION                   │
│     ├─ Check if LinkedIn URL?                       │
│     │   ├─ YES → extractFromLinkedInUrl()           │
│     │   └─ NO  → Continue below                     │
│     │                                                │
│     ├─ Call: crawlWebsite(url)                      │
│     │      └─ Scrapes 15 pages in parallel          │
│     │                                                │
│     └─ Call: extractCompanyInfo(pages)              │
│            └─ Perplexity AI extraction              │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  4. CRAWL-WEBSITE FUNCTION                          │
│     ├─ Build list of target pages                   │
│     ├─ Process in batches of 5                      │
│     ├─ Call scrape-website for each                 │
│     └─ Aggregate results                            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  5. SCRAPE-WEBSITE FUNCTION (×15 pages)             │
│     ├─ HTTP Fetch with browser headers              │
│     ├─ Cheerio HTML parsing                         │
│     ├─ Extract metadata                             │
│     ├─ Extract emails & social links                │
│     ├─ Extract structured data                      │
│     │   ├─ Headings (H1-H6)                         │
│     │   ├─ Paragraphs                               │
│     │   ├─ Lists                                    │
│     │   └─ Tables                                   │
│     └─ Return page data                             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  6. AI EXTRACTION (Perplexity)                      │
│     ├─ Receive all 15 pages of content              │
│     ├─ Analyze text, structure, metadata            │
│     ├─ Perform web search for missing data          │
│     ├─ Extract structured information:              │
│     │   ├─ Company basics                           │
│     │   ├─ Contact info                             │
│     │   ├─ Leadership                               │
│     │   ├─ Services                                 │
│     │   ├─ Technology                               │
│     │   ├─ Blogs                                    │
│     │   ├─ Business goals                           │
│     │   └─ Testimonials                             │
│     └─ Return JSON                                  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  7. FORMAT & RETURN RESPONSE                        │
│     └─ Simplify to standard structure               │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  8. FRONTEND RECEIVES DATA                          │
│     ├─ Map fields to form structure                 │
│     ├─ Update form state                            │
│     ├─ Show success toast                           │
│     └─ Form fields now populated                    │
└─────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

### Timing Breakdown

| Step | Duration | Notes |
|------|----------|-------|
| Frontend request | <100ms | Instant |
| Crawl 15 pages | 10-30s | Parallel processing |
| AI extraction | 10-20s | Perplexity processing |
| Response & mapping | <1s | Fast |
| **Total** | **20-50s** | Complete flow |

### Resource Usage

- **Network Requests:** ~17 (1 main + 15 pages + 1 AI)
- **Data Transferred:** ~2-5MB (HTML from pages)
- **Memory:** ~200MB (page content + AI processing)
- **API Costs:**
  - Cheerio: Free
  - Perplexity: ~$0.01 per extraction

---

## Error Handling

### Frontend Error Handling

```typescript
try {
  // API call
} catch (error) {
  console.error('AI Prefill error:', error);
  showToast('error', 'AI Autofill encountered an error');
} finally {
  setAiPrefilling(false); // Always stop loading
}
```

### Backend Error Handling

Each function has comprehensive error handling:

1. **Invalid URL** → 400 error
2. **Missing API key** → 400 error with message
3. **Scraping timeout** → Skip page, continue
4. **AI extraction failure** → Return partial data
5. **Parse error** → Return empty result

### Fallback Strategy

```
┌─ Try Crawl 15 Pages
│     ├─ SUCCESS → Continue
│     └─ FAIL → Fallback to homepage only
│
├─ Try AI Extraction
│     ├─ SUCCESS → Return full data
│     └─ FAIL → Return crawled data only
│
└─ Try Parse Response
      ├─ SUCCESS → Update form
      └─ FAIL → Show warning message
```

---

## Key Technologies Used

1. **Cheerio** (HTML Parser)
   - Fast jQuery-like syntax
   - Extracts structured data
   - No external dependencies

2. **Perplexity AI** (Data Extraction)
   - Web search capability
   - Structured data extraction
   - High accuracy

3. **Supabase Edge Functions** (Backend)
   - Serverless execution
   - Auto-scaling
   - Fast response times

4. **React** (Frontend)
   - Form state management
   - Real-time updates
   - User feedback

---

## Summary

The "AI Autofill from URL" button triggers a sophisticated **7-step process**:

1. **Frontend** sends URL to backend
2. **Orchestrator** decides LinkedIn vs regular website
3. **Crawler** scrapes 15 pages in parallel
4. **Cheerio** extracts data from each page
5. **Perplexity AI** analyzes all content + web search
6. **Backend** formats structured response
7. **Frontend** maps data to form fields

**Result:** ~30-50 fields auto-populated in 20-50 seconds with high accuracy.

**Key Innovation:** Combines web crawling (Cheerio) + AI analysis (Perplexity) for comprehensive data extraction that would take humans 15-30 minutes manually.
