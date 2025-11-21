# Data Extraction Troubleshooting Guide

## Overview

The hybrid extraction system uses Cheerio for structured HTML parsing and OpenAI's LLM for intelligent data extraction. This guide helps diagnose and fix extraction issues.

## Quick Diagnosis

### 1. Check Browser Console

Open Developer Tools (F12) → Console tab when testing extraction. Look for:

```
Extracting data from: https://example.com
Using OpenAI key: true
```

If you see `Using OpenAI key: false`, the OpenAI API key is not configured.

### 2. Check Supabase Edge Function Logs

Go to Supabase Dashboard → Edge Functions → Logs

Look for:
```
Starting extraction for: https://example.com
OpenAI API Key configured: true
```

If you see `OpenAI API Key configured: false`, the key is not set as a Supabase secret.

## Common Issues and Solutions

### Issue 1: "No data extracted" or Empty Results

**Symptoms:**
- Extraction completes but no data is populated
- Services, blogs, technology fields are empty
- Only basic info (name, URL) is extracted

**Causes:**
1. OpenAI API key not configured
2. API key is invalid or expired
3. Website blocks scraping
4. Website requires JavaScript to render content

**Solutions:**

#### Solution 1A: Set OpenAI Key in Settings
1. Go to **Settings** in the app
2. Enter your OpenAI API key in the **API Configuration** section
3. Click Save
4. Try extraction again

#### Solution 1B: Set as Supabase Secret (Recommended for Production)
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key-here
```

#### Solution 1C: Check API Key Validity
- Log in to https://platform.openai.com/api-keys
- Verify your API key is active
- Check your usage limits and billing

#### Solution 1D: Website Blocking
Some websites block automated scraping. Check the logs for:
- HTTP 403 (Forbidden)
- HTTP 429 (Rate Limited)
- CAPTCHA challenges

Try using Firecrawl or another scraping service for these sites.

### Issue 2: "OpenAI API key not configured" Error

**Symptoms:**
- Error message in browser: "Please configure your OpenAI API key in Settings"
- Extraction won't start

**Solution:**
1. Navigate to Settings page
2. Look for "API Configuration" section
3. Enter your OpenAI API key (starts with `sk-proj-...`)
4. Click Save
5. Verify key is saved: Check browser localStorage in DevTools

```javascript
// In browser console:
localStorage.getItem('openai_key')
// Should return your API key
```

### Issue 3: Extraction Takes Too Long / Times Out

**Symptoms:**
- Extraction spinner runs for 2+ minutes
- Eventually times out with error
- Inconsistent results

**Causes:**
- Website has many pages
- Slow server response
- LLM processing delay

**Solutions:**

#### Solution 3A: Reduce Scope
Modify the crawl settings in `extract-company-data/index.ts`:
```typescript
maxPages: 15, // Reduce from 50 to 15
followLinks: false // Only crawl specific pages
```

#### Solution 3B: Use Faster Model
Currently using `gpt-4o-mini`. This is already optimized for speed and cost.

#### Solution 3C: Increase Function Timeout
Edge functions have a default timeout. If using Supabase, increase it in `supabase/functions/extract-company-data/index.ts`.

### Issue 4: Inaccurate or Wrong Data

**Symptoms:**
- Services extracted don't match website
- Wrong company name or details
- Hallucinated information

**Causes:**
- LLM misinterpreting structured data
- Poor quality HTML structure on website
- Ambiguous content

**Solutions:**

#### Solution 4A: Improve Prompts
Edit the extraction prompts in the edge functions to be more specific:

```typescript
// In extract-services/index.ts
content: `You are a service extractor. ONLY extract services explicitly
mentioned in the data. DO NOT infer or guess. If uncertain, skip it.`
```

#### Solution 4B: Use More Structured Data
The hybrid approach already sends structured data to LLM. Verify Cheerio is extracting the right structure:

Check logs for:
```
Structured data prepared: {
  headings: 25,
  paragraphs: 40,
  lists: 5
}
```

If counts are low, the website may have poor HTML structure.

#### Solution 4C: Manual Review
Always review extracted data before saving. The system provides a preview - verify accuracy before clicking Save.

### Issue 5: Functions Return 500 Error

**Symptoms:**
- Error in browser: "Failed to extract data"
- 500 Internal Server Error in network tab
- Supabase logs show errors

**Causes:**
- Syntax error in edge function
- OpenAI API error
- Network/timeout issues

**Solutions:**

#### Solution 5A: Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Logs
3. Look for the error message
4. Common errors:
   - "Failed to fetch webpage" → Website is down or blocking
   - "OpenAI API error: 401" → Invalid API key
   - "OpenAI API error: 429" → Rate limited

#### Solution 5B: Redeploy Functions
```bash
supabase functions deploy extract-company-data
supabase functions deploy extract-services
supabase functions deploy extract-blogs
supabase functions deploy extract-technology
supabase functions deploy scrape-website
```

#### Solution 5C: Check OpenAI API Status
- Visit https://status.openai.com/
- Verify API is operational

### Issue 6: Extraction Works But Missing Specific Data Types

**Symptoms:**
- Services extracted but no blogs
- Technology stack empty but services populated
- Team members not extracted

**Causes:**
- Website doesn't have that type of content
- Content is on different pages not crawled
- LLM prompt is too restrictive

**Solutions:**

#### Solution 6A: Check Source Website
Manually verify the data exists on the website:
- Visit /blog for blog posts
- Look for /team or /about for team info
- Check /technology or /stack for tech info

#### Solution 6B: Expand Crawl Targets
In `crawl-website/index.ts`, add more target pages:

```typescript
targetPages = [
  '', 'about', 'about-us', 'contact', 'team', 'leadership',
  'services', 'products', 'solutions', 'blog', 'news',
  'case-studies', 'testimonials', 'technology', 'partners',
  'careers', 'jobs', 'culture' // Add these
]
```

#### Solution 6C: Use Specific Extractors
Instead of the all-in-one extractor, use specific ones:
- `extract-services` for services only
- `extract-blogs` for blog posts only
- `extract-technology` for tech stack only

## Testing Extraction Locally

### Test Individual Functions

```bash
# Test services extraction
curl -X POST http://localhost:54321/functions/v1/extract-services \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/services", "openaiKey": "sk-proj-..."}'

# Test blogs extraction
curl -X POST http://localhost:54321/functions/v1/extract-blogs \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/blog", "openaiKey": "sk-proj-..."}'

# Test full extraction
curl -X POST http://localhost:54321/functions/v1/extract-company-data \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "openaiKey": "sk-proj-..."}'
```

### Test Cheerio Scraping Only

```bash
curl -X POST http://localhost:54321/functions/v1/scrape-website \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "includeLinks": true}'
```

This tests if the website can be scraped at all (before LLM processing).

## Performance Optimization

### Current Performance Benchmarks

| Operation | Expected Time | Token Usage |
|-----------|---------------|-------------|
| Scrape single page (Cheerio) | 2-5 seconds | 0 |
| Extract services (LLM) | 3-8 seconds | ~4,000 tokens |
| Extract blogs (LLM) | 3-8 seconds | ~6,000 tokens |
| Extract technology (LLM) | 2-5 seconds | ~5,000 tokens |
| Full extraction (all) | 15-30 seconds | ~20,000 tokens |

### Reduce Costs

The system uses `gpt-4o-mini` which costs:
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

For a typical extraction (~20K tokens), cost is approximately **$0.003 per extraction**.

To reduce costs further:
1. Use Supabase secrets instead of passing key in request (reduces redundant checks)
2. Cache scraped data to avoid re-scraping
3. Use basic extraction for low-value data

## Monitoring and Debugging

### Enable Detailed Logging

Add this to your edge function for more detailed logs:

```typescript
console.log('=== DEBUG START ===');
console.log('Structured data:', JSON.stringify(structuredData, null, 2));
console.log('LLM response:', JSON.stringify(result, null, 2));
console.log('=== DEBUG END ===');
```

### Track Extraction Success Rate

Monitor these metrics in your logs:
- Total extractions attempted
- Successful extractions (data populated)
- Failed extractions (errors)
- Fallback usage (basic extraction without LLM)

### User Feedback

Add a feedback mechanism to report inaccurate extractions:
- "Was this extraction accurate?"
- "Report incorrect data"

This helps identify problematic websites or extraction patterns.

## Getting Help

If issues persist:

1. **Check documentation**: Review `/docs/hybrid-extraction-approach.md`
2. **Check examples**: See working examples in test files
3. **Review logs**: Always start with Supabase Edge Function logs
4. **Test incrementally**: Test scraping → LLM extraction → full flow
5. **Verify API keys**: Both OpenAI and Supabase keys must be valid

## Advanced Debugging

### Inspect Structured Data

Before LLM processes the data, log what Cheerio extracted:

```typescript
console.log('Cheerio extracted headings:', structuredData.headings);
console.log('Cheerio extracted paragraphs:', structuredData.paragraphs.length);
```

If these are empty or incorrect, the issue is with scraping, not LLM.

### Test LLM Prompts

Copy the structured data from logs and test it directly with OpenAI:

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-proj-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "Extract services from this data"},
      {"role": "user", "content": "YOUR_STRUCTURED_DATA_HERE"}
    ]
  }'
```

This isolates whether the issue is with prompts or data quality.

### Compare Against Manual Extraction

Extract data manually from a website, then compare with automated extraction:
- What was missed?
- What was incorrect?
- What was hallucinated?

Use these insights to refine prompts and extraction logic.
