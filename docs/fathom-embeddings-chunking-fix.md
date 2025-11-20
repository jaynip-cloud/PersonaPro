# Fathom Embeddings Chunking Fix

## Problem
The Intelligence Agent was not reading Fathom meeting transcripts because:

1. **Broken Chunking Algorithm**: The `process-fathom-embeddings` function was creating ONE massive chunk per recording instead of properly chunking transcripts
   - Recording 1: 25,602 chars in 1 chunk (should be ~4-5 chunks)
   - Recording 2: 10,193 chars in 1 chunk (should be ~2 chunks)
   - Recording 3: 36,240 chars transcript but 0 embeddings (marked as generated but failed)

2. **Search Function Mismatch**: The old `match_documents` function only searched `document_embeddings` table, missing `fathom_embeddings`

## Root Cause

### Chunking Bug
The chunking algorithm in `process-fathom-embeddings/index.ts` had a critical flaw:

```typescript
// OLD CODE (BROKEN)
if (currentChunk && currentChunk.length + segmentText.length > chunkSizeChars) {
  // Save chunk and create new one
}
// Then ALWAYS add the segment
currentChunk += segmentText;
```

**The Problem**: The loop would check if adding the next segment would exceed the limit, save the chunk, create overlap, but then STILL add all subsequent segments to the same "new" chunk without ever checking the size again. This caused the entire transcript to end up in one massive chunk.

### Fixed Algorithm
```typescript
// NEW CODE (FIXED)
const wouldExceedLimit = currentChunk && (currentChunk.length + segmentText.length + 2) > chunkSizeChars;

if (wouldExceedLimit) {
  // Save current chunk BEFORE adding this segment
  chunks.push({...});

  // Create overlap and start new chunk
  // But DON'T skip current segment - add it below
}

// Add current segment to chunk (either existing or new)
currentChunk += segmentText;
```

## Changes Made

### 1. Fixed Chunking Logic
**File**: `supabase/functions/process-fathom-embeddings/index.ts`
- Fixed the while loop to properly check chunk size on each iteration
- Ensured segments are added to new chunks after splitting
- Properly implements overlap between chunks for context continuity

### 2. Created Unified Search Function
**File**: `supabase/migrations/[timestamp]_create_unified_semantic_search_function.sql`
- Created `match_all_content()` RPC function
- Searches BOTH `document_embeddings` and `fathom_embeddings` tables
- Uses UNION ALL to combine results
- Returns unified schema with source type indicators

### 3. Updated Intelligence Agent
**File**: `supabase/functions/answer-client-query/index.ts`
- Changed from `match_documents()` to `match_all_content()`
- Updated context building to handle Fathom transcript matches
- Added speaker names and meeting dates to citations
- Updated metadata to track Fathom transcript matches separately
- Upgraded embedding model to `text-embedding-3-small` for consistency

### 4. Reset Existing Data
- Deleted all broken embeddings (2 total)
- Reset `embeddings_generated` flag to `false` for all 3 recordings
- Recordings ready for reprocessing with fixed code

## Next Steps

To fully resolve the issue:

1. **Retrigger Embedding Generation**: The frontend needs to call `process-fathom-embeddings` for each of the 3 recordings:
   - `fe1bc853-537f-4810-8f00-eeb4d5c45ec3` (SOS Biweekly Meeting)
   - `59a0bb47-7520-44dc-90f6-5a23473f7d42` (Ro Sham Bo)
   - `6d2b80a3-80dd-44e8-8a80-45d1c66f21b5` (WLIQ and Brilliant Media)

2. **Verify Results**: After reprocessing, verify:
   - Each recording has multiple chunks (4-10+ depending on length)
   - Each chunk is ~1500-2000 tokens (6000-8000 chars)
   - Intelligence Agent can find and cite Fathom content

## Expected Results

After reprocessing with the fix:

- **SOS Meeting** (36K chars): ~6-7 chunks
- **Ro Sham Bo** (25K chars): ~4-5 chunks
- **WLIQ** (10K chars): ~2 chunks

## Testing

To test the Intelligence Agent now reads Fathom data:

1. Go to a client with Fathom recordings
2. Ask questions like:
   - "What was discussed in recent meetings?"
   - "What pain points were mentioned?"
   - "Who attended the meetings?"
3. Check the response includes citations from Fathom recordings
4. Verify metadata shows `fathomTranscriptsFound > 0`

## Technical Details

- **Chunk Size**: 1500 tokens (~6000 chars)
- **Overlap**: 200 tokens (~800 chars)
- **Embedding Model**: `text-embedding-3-small` (1536 dimensions)
- **Search Threshold**: 0.65-0.75 (adaptive based on query type)
