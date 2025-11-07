# Meeting Transcript Vectorization

This document explains how meeting transcripts are vectorized and made searchable using semantic search.

## Overview

Meeting transcripts are automatically vectorized when saved or updated, enabling semantic search across all meeting content. The system uses OpenAI's `text-embedding-ada-002` model to generate embeddings and stores them in the `document_embeddings` table alongside document embeddings.

## Architecture

### Database Schema

The `document_embeddings` table has been extended with a `source_type` field to distinguish between:
- `document` - Regular document embeddings (default)
- `meeting_transcript` - Meeting transcript embeddings

### Key Components

1. **Migration**: `20251115000000_add_source_type_to_embeddings.sql`
   - Adds `source_type` column to `document_embeddings` table
   - Creates indexes for efficient filtering

2. **Edge Function**: `supabase/functions/vectorize-meeting-transcript/index.ts`
   - Generates embeddings for meeting transcripts
   - Splits long transcripts into chunks (8000 chars each)
   - Stores embeddings with metadata (meeting date, title, sentiment, action items)

3. **Utility Functions**: `src/utils/transcriptEmbeddings.ts`
   - `vectorizeMeetingTranscript()` - Vectorize a single transcript
   - `vectorizeAllClientTranscripts()` - Batch vectorize all transcripts for a client
   - `isTranscriptVectorized()` - Check if a transcript has been vectorized

## Automatic Vectorization

Meeting transcripts are automatically vectorized when:
- A new transcript is saved
- An existing transcript is updated

The vectorization happens asynchronously and does not block the save operation. If vectorization fails, the transcript is still saved, but an error is logged.

## Usage

### Manual Vectorization

```typescript
import { vectorizeMeetingTranscript } from '../utils/transcriptEmbeddings';

// Vectorize a single transcript
await vectorizeMeetingTranscript(transcriptId, { clientId: 'client-uuid' });

// Vectorize all transcripts for a client
import { vectorizeAllClientTranscripts } from '../utils/transcriptEmbeddings';
const result = await vectorizeAllClientTranscripts(clientId);
console.log(`Success: ${result.success}, Failed: ${result.failed}`);
```

### Semantic Search

Meeting transcripts are automatically included in semantic search results:

```typescript
import { semanticSearch } from '../utils/documentEmbeddings';

const results = await semanticSearch('What are the client\'s main pain points?', {
  clientId: 'client-uuid',
  limit: 10,
  similarityThreshold: 0.7
});

// Results include both documents and meeting transcripts
results.forEach(result => {
  console.log(`Source: ${result.source_type}`); // 'document' or 'meeting_transcript'
  console.log(`Content: ${result.content_chunk}`);
  console.log(`Similarity: ${result.similarity}`);
});
```

## Metadata Stored

Each transcript embedding includes metadata:
- `transcript_id` - ID of the meeting transcript
- `meeting_date` - Date of the meeting
- `title` - Meeting title
- `sentiment` - Sentiment analysis (if available)
- `action_items` - Action items from the meeting
- `chunk_total` - Total number of chunks
- `chunk_length` - Length of this chunk
- `created_at` - When the transcript was created

## Performance Considerations

- **Chunking**: Long transcripts are split into 8000-character chunks to stay within token limits
- **Indexing**: HNSW index on embeddings enables fast similarity search
- **Filtering**: Indexes on `source_type` and `transcript_id` enable efficient filtering
- **Async Processing**: Vectorization happens asynchronously to avoid blocking UI

## Error Handling

- Vectorization failures are logged but don't prevent transcript saving
- If vectorization fails, transcripts can be manually re-vectorized
- The `isTranscriptVectorized()` function can check vectorization status

## Future Enhancements

- Background job to vectorize existing transcripts
- Automatic re-vectorization when transcripts are updated
- Batch processing for large numbers of transcripts
- Vectorization status indicator in UI

