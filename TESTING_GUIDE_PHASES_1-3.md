# Testing Guide - Phases 1-3: Dual AI Company Profile Enrichment

## Prerequisites

1. ✅ Backend functions deployed to Supabase:
   - `enrich-company-perplexity`
   - `enrich-company-openai`
   - `compare-ai-responses` (updated)

2. ✅ Environment variables configured:
   - `PERPLEXITY_API_KEY` in Supabase secrets
   - `OPENAI_API_KEY` in Supabase secrets

3. ✅ Frontend code updated:
   - OnboardingWizard component updated
   - CompanyAIFetchProgress component created
   - CompanyAIResponseComparison component created

---

## Test Scenarios

### Test 1: Auto-Trigger Functionality

**Steps:**
1. Open the application and navigate to onboarding (or trigger onboarding wizard)
2. Go to Step 1: Company Information
3. Fill in the 3 required fields:
   - **Company Name**: e.g., "Stripe"
   - **Website**: e.g., "https://stripe.com"
   - **Industry**: e.g., "Financial Technology"
4. **Expected Behavior:**
   - Dual AI fetch should automatically trigger when all 3 fields are filled
   - You should see `CompanyAIFetchProgress` component appear
   - Both Perplexity and OpenAI responses should start fetching in parallel
   - Console should show: `[ONBOARDING-WIZARD] Auto-triggering dual AI fetch for company profile`

**What to Check:**
- ✅ Auto-trigger happens automatically (no button click needed)
- ✅ Both AI calls start simultaneously
- ✅ Progress indicators show for both responses
- ✅ No errors in browser console

---

### Test 2: Dual AI Fetch Progress

**Steps:**
1. After auto-trigger, watch the `CompanyAIFetchProgress` component
2. Observe both response cards (Response 1 - Perplexity, Response 2 - OpenAI)

**Expected Behavior:**
- Both cards show loading state initially
- Cards update as responses come in
- Each card shows:
  - Completeness percentage
  - Processing time
  - Company information preview
  - Contact information
  - Social media profiles
  - Services count
  - Leadership count
  - Blog posts count
  - Technology stack count

**What to Check:**
- ✅ Both responses complete successfully
- ✅ Data is displayed correctly in preview cards
- ✅ Completeness scores are calculated (should be > 0%)
- ✅ Processing times are shown

---

### Test 3: Comparison Display

**Steps:**
1. Wait for both AI responses to complete
2. Comparison should automatically trigger
3. `CompanyAIResponseComparison` component should appear

**Expected Behavior:**
- Side-by-side comparison of both responses
- Recommendation badge on the better response
- Scores displayed (0-100 for each)
- Reasoning explanation
- Strengths and weaknesses listed
- Key differences highlighted

**What to Check:**
- ✅ Comparison appears after both responses complete
- ✅ Recommendation is shown (green badge)
- ✅ Scores are reasonable (0-100 range)
- ✅ Reasoning is clear and specific
- ✅ Strengths/weaknesses are listed for both responses

---

### Test 4: Response Selection

**Steps:**
1. Review both responses in the comparison view
2. Click "Use This Response" or "I Prefer This Response" on either card
3. Check if form data is populated

**Expected Behavior:**
- Selected response data should populate the form fields
- All company profile fields should be filled:
  - Company Name, Website, Industry
  - Description, Value Proposition
  - Founded, Location, Size
  - Mission, Vision
  - Email, Phone, Address
  - Social media URLs (LinkedIn, Twitter, Facebook, Instagram, YouTube)
  - Services array
  - Leadership array
  - Blogs array
  - Technology stack, partners, integrations

**What to Check:**
- ✅ Form fields are populated correctly
- ✅ Arrays (services, leadership, blogs) are populated
- ✅ Technology object is structured correctly
- ✅ No data loss or corruption
- ✅ User can proceed to next steps with populated data

---

### Test 5: Regenerate Functionality

**Steps:**
1. After initial fetch completes, click "Regenerate" button
2. Observe the process

**Expected Behavior:**
- Both AI calls should trigger again
- Previous responses should be cleared
- New responses should be fetched
- Comparison should be regenerated

**What to Check:**
- ✅ Regenerate button works
- ✅ New data is fetched (may differ from first fetch)
- ✅ Comparison is updated with new results

---

### Test 6: Error Handling

**Test Scenarios:**

**6a. One AI Fails:**
- Simulate Perplexity API failure (or use invalid API key)
- **Expected:** OpenAI response should still work
- **Expected:** Comparison should show partial results
- **Expected:** Error message displayed for failed response

**6b. Both AI Fail:**
- Simulate both API failures
- **Expected:** Error messages shown for both
- **Expected:** User can still manually fill form
- **Expected:** No crashes or broken UI

**6c. Network Issues:**
- Simulate slow network or timeout
- **Expected:** Loading states persist
- **Expected:** Timeout handling works
- **Expected:** User can retry

---

### Test 7: Data Mapping Verification

**Steps:**
1. Select a response (either Perplexity or OpenAI)
2. Verify data mapping to form fields

**Check Mapping:**
- ✅ `companyName` → `formData.companyName`
- ✅ `website` → `formData.website`
- ✅ `industry` → `formData.industry`
- ✅ `description` → `formData.description`
- ✅ `valueProposition` → (check if this field exists in form)
- ✅ `founded` → `formData.founded`
- ✅ `location` → `formData.location`
- ✅ `size` → `formData.size`
- ✅ `mission` → `formData.mission`
- ✅ `vision` → `formData.vision`
- ✅ `email` → `formData.email`
- ✅ `phone` → `formData.phone`
- ✅ `address` → `formData.address`
- ✅ `linkedinUrl` → `formData.linkedinUrl`
- ✅ `twitterUrl` → `formData.twitterUrl`
- ✅ `facebookUrl` → `formData.facebookUrl`
- ✅ `instagramUrl` → `formData.instagramUrl`
- ✅ `youtubeUrl` → `formData.youtubeUrl`
- ✅ `services` array → `formData.services`
- ✅ `leadership` array → `formData.leadership`
- ✅ `blogs` array → `formData.blogs`
- ✅ `technology.stack` → `formData.techStack`
- ✅ `technology.partners` → `formData.partners`
- ✅ `technology.integrations` → `formData.integrations`

---

### Test 8: Console Logging

**Check Browser Console:**
- ✅ `[ONBOARDING-WIZARD] Auto-triggering dual AI fetch for company profile`
- ✅ `[ONBOARDING-WIZARD] 🚀 Starting Perplexity fetch`
- ✅ `[ONBOARDING-WIZARD] 🚀 Starting OpenAI fetch`
- ✅ `[ONBOARDING-WIZARD] ✅ Both fetches completed`
- ✅ `[ONBOARDING-WIZARD] 🔍 Starting comparison`
- ✅ `[ONBOARDING-WIZARD] 👤 User selected response`

**Check for Errors:**
- ❌ No authentication errors
- ❌ No API errors (unless intentional testing)
- ❌ No JSON parsing errors
- ❌ No undefined/null reference errors

---

### Test 9: Edge Cases

**9a. Empty Fields:**
- Try with empty company name
- Try with invalid website URL
- **Expected:** Auto-trigger should NOT fire
- **Expected:** Validation should prevent fetch

**9b. Partial Data:**
- Test with company that has limited online presence
- **Expected:** Both AIs should still return data (even if sparse)
- **Expected:** Completeness scores may be lower
- **Expected:** Comparison should still work

**9c. Special Characters:**
- Test with company names containing special characters
- **Expected:** Data should be handled correctly
- **Expected:** No encoding issues

**9d. Very Long Data:**
- Test with companies that have extensive data
- **Expected:** All data should be captured
- **Expected:** UI should handle long lists gracefully

---

### Test 10: Performance

**Measure:**
- Time to fetch Perplexity response
- Time to fetch OpenAI response
- Time to generate comparison
- Total time from trigger to comparison display

**Expected:**
- Perplexity: 10-30 seconds (web search takes time)
- OpenAI: 5-15 seconds (knowledge base is faster)
- Comparison: 3-8 seconds
- Total: 15-50 seconds (depending on network)

---

## Debugging Tips

### If Auto-Trigger Doesn't Work:
1. Check browser console for errors
2. Verify all 3 fields are filled (no whitespace-only)
3. Check if `hasAutoFetched` state is blocking
4. Verify `aiPrefilling` state is false
5. Check if responses already exist

### If Data Doesn't Populate:
1. Check `mapAIResponseToFormData` function
2. Verify response structure matches expected format
3. Check browser console for mapping errors
4. Verify form field names match

### If Comparison Doesn't Show:
1. Check if both responses completed successfully
2. Verify `fetchComparison` is called
3. Check comparison API response in network tab
4. Verify `dataType: 'company'` is sent

### If Errors Occur:
1. Check Supabase function logs
2. Verify API keys are configured
3. Check network tab for failed requests
4. Verify authentication is working

---

## Success Criteria

✅ **Phase 1 (Backend):**
- All 3 functions deployed successfully
- Functions return correct data structure
- Completeness scores calculated correctly
- Comparison works for company profile data

✅ **Phase 2 (Frontend - OnboardingWizard):**
- Auto-trigger works when 3 fields filled
- Dual AI fetch executes in parallel
- Progress indicators show correctly
- Data mapping works correctly
- Form population works

✅ **Phase 3 (UI Components):**
- CompanyAIFetchProgress displays correctly
- CompanyAIResponseComparison displays correctly
- Comparison recommendation works
- Response selection works
- Regenerate works

---

## Test Data Suggestions

**Good Test Companies:**
1. **Stripe** - https://stripe.com - Financial Technology
2. **Shopify** - https://shopify.com - E-commerce Platform
3. **Notion** - https://notion.so - Productivity Software
4. **Airbnb** - https://airbnb.com - Travel Technology
5. **Slack** - https://slack.com - Communication Software

**Why These:**
- Well-known companies with extensive online presence
- Rich data available (services, leadership, blogs, tech stack)
- Good for testing completeness scores
- Should return high-quality data from both AIs

---

## Next Steps After Testing

Once Phases 1-3 are tested and working:
1. ✅ Document any issues found
2. ✅ Fix any bugs discovered
3. ✅ Optimize if performance issues found
4. ✅ Proceed to Phase 4 (Knowledge Base updates)

---

## Quick Test Checklist

- [ ] Auto-trigger works when 3 fields filled
- [ ] Both AI responses fetch successfully
- [ ] Progress indicators show correctly
- [ ] Comparison displays after both complete
- [ ] Recommendation is shown
- [ ] Response selection populates form
- [ ] All form fields are mapped correctly
- [ ] Regenerate works
- [ ] Error handling works (one/both fail)
- [ ] Console logging is helpful
- [ ] No crashes or broken UI
- [ ] Performance is acceptable (< 60 seconds total)

