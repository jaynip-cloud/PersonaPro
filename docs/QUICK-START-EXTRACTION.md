# Quick Start: Hybrid Extraction System

## 1. Configure OpenAI API Key ⚡

**Option A: In the App (Easiest)**
1. Click **Settings** in sidebar
2. Find **API Configuration**
3. Paste your OpenAI API key (starts with `sk-proj-`)
4. Click **Save**

**Option B: As Supabase Secret (Production)**
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-key-here
```

## 2. Extract Company Data 🚀

**Method 1: Add Client Page**
1. Go to **Clients** → **Add New Client**
2. Enter website URL (e.g., `https://stripe.com`)
3. Click **✨ AI Autofill** button
4. Wait 15-30 seconds
5. Data auto-populates!

**Method 2: Knowledge Base**
1. Go to **Knowledge Base**
2. Click **AI-Powered Deep Website Crawling**
3. Enter website URL
4. Click **Start Deep Crawl & Extract**
5. Review extracted data in tabs

## 3. Verify Extraction ✅

Check browser console (F12) for:
```
Extracting data from: https://stripe.com
Using OpenAI key: true
```

If you see `Using OpenAI key: false`:
- OpenAI key not configured
- Go to Settings and add your key

## 4. Check Results 📊

Good extraction should have:
- ✅ Company name and description
- ✅ 3-10+ services extracted
- ✅ 2-5+ blog articles found
- ✅ 5-15+ technologies identified
- ✅ Social profiles (LinkedIn, Twitter)
- ✅ Contact information (email, phone)

Partial extraction (without LLM):
- ⚠️ Basic info only (name, URL)
- ⚠️ Few or no services/blogs
- ⚠️ Limited technology (keyword matching)

## 5. Troubleshooting 🔧

### No data extracted?
→ Check OpenAI key in Settings
→ Verify key is valid on platform.openai.com
→ Check Supabase logs for errors

### Wrong/inaccurate data?
→ Try a different website (some have poor structure)
→ Review extraction manually before saving
→ Report issues for pattern improvement

### Takes too long / timeout?
→ Some sites are large (50+ pages)
→ Be patient (can take 30-60 seconds)
→ Try a simpler website first

## What Gets Extracted? 📝

- **Company Info**: Name, industry, description, size, founded
- **Services**: All services and sub-services with descriptions
- **Blogs**: Article titles, URLs, dates, authors, excerpts
- **Technology**: Tech stack, partners, integrations
- **Team**: Leadership, contacts, decision makers
- **Social**: LinkedIn, Twitter, Facebook, Instagram
- **Contact**: Emails, phones, address, location

## API Key Safety 🔒

Your API key is:
- ✅ Stored locally in browser (localStorage)
- ✅ Only sent to your Supabase functions
- ✅ Never logged or stored in database
- ✅ Can be set as Supabase secret (more secure)

## Cost 💰

With gpt-4o-mini:
- **~$0.003 per extraction** (20K tokens)
- **~$0.30 for 100 extractions**
- **~$3 for 1,000 extractions**

Very affordable for production use!

## Need Help? 📚

See detailed documentation:
- `HYBRID-EXTRACTION-SUMMARY.md` - Full implementation details
- `EXTRACTION-TROUBLESHOOTING.md` - Common issues and fixes
- `TEST-EXTRACTION.md` - Testing guide with examples
- `SETUP-OPENAI-KEY.md` - API key configuration

## Test Websites 🧪

Good for testing:
- ✅ https://stripe.com
- ✅ https://vercel.com
- ✅ https://supabase.com
- ✅ https://github.com

Avoid:
- ❌ Sites with bot protection
- ❌ Sites requiring JavaScript
- ❌ Sites with CAPTCHA
- ❌ Sites with aggressive rate limiting

## Success! 🎉

You're ready to extract company data automatically!

**Tips for best results:**
- Use the root domain URL (e.g., `https://example.com`)
- Ensure website is accessible (not requiring login)
- Allow 30-60 seconds for large sites
- Review extracted data before saving
- Save API key in Settings for convenience

---

**Quick Reference:**
- Settings → Add OpenAI Key
- Clients → Add New → Enter URL → AI Autofill
- Wait 15-30 seconds → Verify data → Save

That's it! Happy extracting! ✨
