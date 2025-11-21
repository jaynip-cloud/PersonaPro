# Setting Up OpenAI API Key for Edge Functions

## Problem

The hybrid extraction approach requires an OpenAI API key to function. Edge functions cannot access the `.env` file in the project root - they need the key to be set as a **Supabase secret**.

## Solution

### Option 1: Set via Supabase CLI (Recommended)

```bash
# Set the OpenAI API key as a Supabase secret
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here

# Verify the secret is set
supabase secrets list
```

### Option 2: Set via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Click **Add Secret**
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key (starts with `sk-proj-...`)
6. Click **Save**

### Option 3: Temporary Testing (Not for Production)

For local testing only, you can modify the edge function to accept the API key from the request body:

**IMPORTANT**: This is NOT secure for production as it exposes the API key to the client.

## Verifying Setup

After setting the secret, test the extraction:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/extract-company-data \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Check the logs in Supabase dashboard under **Edge Functions** → **Logs** to see:
```
OpenAI API Key configured: true
```

## Fallback Behavior

If the OpenAI API key is not configured, the extraction functions will automatically fall back to basic rule-based extraction using Cheerio only. This provides:

- Basic service extraction from headings
- Simple team member extraction from text patterns
- Technology keyword matching
- Limited testimonial extraction

However, the results will be less accurate and comprehensive compared to the LLM-enhanced extraction.

## Current Status

The `.env` file in the project root contains the OpenAI API key:
```
OPENAI_API_KEY=sk-proj-...
```

**This key is ONLY used by the frontend Vite app, NOT by edge functions.**

To enable full LLM-powered extraction, you must set it as a Supabase secret using one of the methods above.
