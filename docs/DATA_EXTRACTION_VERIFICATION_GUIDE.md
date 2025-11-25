# Data Extraction Verification Guide

## How to Verify Extracted Data is Correct

### Step 1: Identify the Website URL
Share the website URL you want me to verify, or check your database/client records for the website URL.

### Step 2: Manual Verification Checklist

For each extracted field, verify against the actual website:

#### ✅ Company Information
- [ ] **Company Name**: Check homepage, About page, LinkedIn
- [ ] **Industry**: Should match LinkedIn company page
- [ ] **Description**: Compare with About page content
- [ ] **Location**: Check footer, contact page, LinkedIn
- [ ] **Founded Year**: Check About page, LinkedIn, Crunchbase
- [ ] **Company Size**: Check LinkedIn company page

#### ✅ Contact Information
- [ ] **Email**: Must be explicitly shown on contact page or footer
  - ❌ WRONG: Guessed emails like `info@company.com` if not shown
  - ✅ CORRECT: Only emails actually displayed on website
- [ ] **Phone**: Must be explicitly shown on contact page or footer
  - ❌ WRONG: Phone numbers extracted from prices or random numbers
  - ✅ CORRECT: Only contact phone numbers displayed
- [ ] **Address**: Check contact page, footer, About page
  - Must include street, city, state, zip code if available

#### ✅ Leadership/Team
- [ ] **CEO/Founder Names**: Check About/Team page, LinkedIn
- [ ] **Titles**: Must match what's shown on website
- [ ] **LinkedIn URLs**: Should link to actual profiles
- [ ] **Bios**: Compare with website content

#### ✅ Services/Products
- [ ] **Service Names**: Check Services/Products page
- [ ] **Descriptions**: Should match website content
- [ ] **Pricing**: Only if explicitly shown on pricing page

#### ✅ Technology Stack
- [ ] **Technologies**: Check job postings, footer, About page
- [ ] **Partners**: Check Partners/Integrations page
- [ ] **Platforms**: Should be technologies actually used

#### ✅ Blog/Content
- [ ] **Blog URLs**: Must be actual blog post URLs
- [ ] **Titles**: Should match blog post titles
- [ ] **Dates**: Should match publication dates
- [ ] **Authors**: Only if mentioned on blog posts

#### ✅ Social Media
- [ ] **LinkedIn**: Check footer, About page
- [ ] **Twitter/X**: Check footer, About page
- [ ] **Facebook**: Check footer, About page
- [ ] **Instagram**: Check footer, About page

### Step 3: Common Issues Found

#### Issue 1: False Positive Phone Numbers
**Problem**: Phone regex picks up prices, IDs, random numbers
**Example**: Extracting "100", "199.00", "1234" as phone numbers
**Solution**: Only extract phone numbers from contact pages, footer, or explicit phone sections

#### Issue 2: Guessed Email Addresses
**Problem**: System creates emails like `info@company.com` even if not shown
**Solution**: Only extract emails explicitly displayed (mailto: links, contact forms)

#### Issue 3: Missing Contact Information
**Problem**: Many companies don't show direct contact info (use forms instead)
**Solution**: Leave fields empty rather than guessing

#### Issue 4: Wrong Company Data
**Problem**: Data from different companies mixed together
**Solution**: Verify company name matches across all sources

#### Issue 5: Outdated Information
**Problem**: Old blog posts, former employees, outdated services
**Solution**: Check dates, verify current information

### Step 4: How to Report Issues

When you find incorrect data, note:
1. **Field Name**: Which field is wrong (e.g., "primaryEmail")
2. **Extracted Value**: What was extracted
3. **Correct Value**: What should be extracted (or "not found")
4. **Source URL**: Where the correct data should be found
5. **Website URL**: The website being checked

### Step 5: Testing a Website

To test extraction on a new website:

1. **Go to the website manually**
2. **Check these pages**:
   - Homepage
   - About page (`/about`, `/about-us`)
   - Contact page (`/contact`)
   - Team page (`/team`, `/leadership`)
   - Services page (`/services`, `/products`)
   - Blog page (`/blog`, `/news`)
   - Footer (scroll down)

3. **Note what's actually visible**:
   - Company name
   - Contact email (if any)
   - Contact phone (if any)
   - Address (if any)
   - Social media links
   - Services/products
   - Team members

4. **Compare with extracted data**:
   - Does extracted data match what's on the website?
   - Are there false positives (wrong data)?
   - Is data missing that should be there?

## Quick Verification Script

I can manually check any website you provide. Just share:
- The website URL
- What data was extracted (or where to find it in your database)

And I'll verify each field against the actual website content.



