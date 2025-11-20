# Intelligence Agent Fathom Integration Fix

## Problem
The Intelligence Agent was not reading Fathom meeting transcripts and summaries when answering user queries. While embeddings were being generated for Fathom transcripts, the semantic search function only looked in the `document_embeddings` table and ignored the `fathom_embeddings` table.

## Root Cause
- Fathom transcript embeddings are stored in the `fathom_embeddings` table
- Document embeddings are stored in the `document_embeddings` table
- The `match_documents()` RPC function only searched `document_embeddings`
- The Intelligence Agent used `match_documents()`, missing all Fathom data

## Solution

### 1. Created Unified Search Function
**Migration**: `create_unified_semantic_search_function.sql`

Created a new `match_all_content()` function that:
- Searches BOTH `document_embeddings` and `fathom_embeddings` tables
- Combines results using UNION ALL
- Returns unified results with proper source type indicators
- Includes metadata about speakers, timestamps, and meeting dates for Fathom content
- Orders all results by similarity score

### 2. Updated Intelligence Agent
**File**: `supabase/functions/answer-client-query/index.ts`

Changes made:
- Switched from `match_documents()` to `match_all_content()` RPC call
- Updated context building to handle Fathom transcript matches separately
- Added speaker names and meeting dates to Fathom excerpt citations
- Updated metadata reporting to include `fathomTranscriptsFound` count
- Upgraded embedding model from `text-embedding-ada-002` to `text-embedding-3-small` for consistency

### 3. Enhanced Context Display
The Intelligence Agent now properly displays:
- **Relevant Documents**: Uploaded PDFs and documents
- **Relevant Meeting Excerpts**: Both manual transcripts AND Fathom recordings
  - Shows meeting title, date, and speaker name
  - Displays similarity percentage
  - Includes the relevant chunk of conversation

## Benefits

1. **Complete Data Coverage**: Intelligence Agent now searches ALL available content
2. **Better Answers**: Can reference specific meeting conversations with citations
3. **Source Attribution**: Clear distinction between documents and meeting transcripts
4. **Speaker Context**: Shows who said what in meetings
5. **Temporal Context**: Includes meeting dates for better understanding

## Usage

When users ask questions like:
- "What pain points did they mention?"
- "What technologies do they use?"
- "What was discussed in recent meetings?"

The Intelligence Agent will now:
1. Search both documents AND Fathom transcripts
2. Find the most relevant content from BOTH sources
3. Cite specific meetings with dates and speakers
4. Provide comprehensive answers based on all available data

## Technical Details

### Embedding Models
- Fathom transcripts: `text-embedding-3-small` (1536 dimensions)
- Other content: Now also using `text-embedding-3-small` for consistency
- Both models are compatible for vector similarity search

### Data Quality Indicators
The response metadata now includes:
- `documentsSearched`: Number of document matches
- `transcriptMatchesFound`: Total transcript excerpts (manual + Fathom)
- `fathomTranscriptsFound`: Specifically Fathom transcript matches
- `transcriptsIncluded`: Full meeting transcripts in context

## Verification

To verify the fix is working:
1. Sync a Fathom recording to a client
2. Wait for embeddings to be generated (check `embeddings_generated: true`)
3. Ask the Intelligence Agent a question about the meeting content
4. Check the response metadata for `fathomTranscriptsFound > 0`
5. Verify the answer includes citations from the Fathom recording
