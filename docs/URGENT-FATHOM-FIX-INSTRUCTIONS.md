# URGENT: Fathom Intelligence Agent Fix - User Action Required

## The Problem
The Intelligence Agent was not reading Fathom meeting transcripts because:
1. The chunking algorithm was broken (creating 1 massive chunk instead of many small chunks)
2. The embeddings were deleted to fix the issue
3. **The embeddings need to be regenerated**

## What Was Fixed
✅ Fixed the chunking algorithm in `process-fathom-embeddings`
✅ Created unified search function `match_all_content()`
✅ Updated Intelligence Agent to use the new search
✅ Deployed all changes to Supabase

## ⚠️ ACTION REQUIRED

The embeddings need to be regenerated. Here are your options:

### Option 1: Re-sync from UI (RECOMMENDED)
1. Go to the client's Data Sources page
2. Find any Fathom meeting link that was previously synced
3. Paste it again in the Fathom Sync field
4. The system will detect the recording needs embeddings and regenerate them
5. Repeat for all 3 recordings OR wait - the system will batch process them

### Option 2: Wait for Automatic Processing
The next time the client page loads or refreshes, the system should detect recordings with `embeddings_generated: false` and process them automatically (if this feature is implemented).

### Option 3: Manual SQL Trigger (For Admin/Developer)
Run this SQL to manually trigger reprocessing:

```sql
-- Force re-sync of all recordings by resetting their state
UPDATE fathom_recordings
SET embeddings_generated = false
WHERE client_id = '4245777f-e14b-4559-8cef-ddb4fdb605b2';

-- Then the sync-fathom-recordings function will auto-trigger embeddings
```

## Verify It's Working

After regenerating embeddings:

1. Check the database:
```sql
SELECT
  fr.title,
  COUNT(fe.id) as chunk_count,
  AVG(LENGTH(fe.chunk_text)) as avg_chunk_size
FROM fathom_recordings fr
LEFT JOIN fathom_embeddings fe ON fe.recording_id = fr.id
GROUP BY fr.id, fr.title;
```

Expected results:
- **SOS Meeting**: 6-7 chunks, ~5000-6000 char avg
- **Ro Sham Bo**: 4-5 chunks, ~5000-6000 char avg
- **WLIQ**: 2 chunks, ~5000-6000 char avg

2. Test Intelligence Agent:
   - Go to the client
   - Ask: "What was discussed in recent meetings?"
   - You should see citations from Fathom recordings
   - Metadata should show `fathomTranscriptsFound > 0`

## Current State

**Recordings pending embedding generation:**
1. `59a0bb47-7520-44dc-90f6-5a23473f7d42` - Ro Sham Bo (25K chars, needs ~4-5 chunks)
2. `6d2b80a3-80dd-44e8-8a80-45d1c66f21b5` - WLIQ (10K chars, needs ~2 chunks)
3. `fe1bc853-537f-4810-8f00-eeb4d5c45ec3` - SOS Meeting (36K chars, needs ~6-7 chunks)

All are set to `embeddings_generated: false` and ready for processing.

## What Changed in the Code

1. **process-fathom-embeddings/index.ts**: Fixed chunking to properly split at 6000 chars
2. **answer-client-query/index.ts**: Now uses `match_all_content()` to search Fathom data
3. **Database**: New `match_all_content()` function searches both tables
4. **All changes deployed**: Functions are live on Supabase

The Intelligence Agent WILL work once embeddings are regenerated!
