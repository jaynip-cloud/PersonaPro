# Regenerate Fathom Embeddings - DO THIS NOW

## The Problem
Recording is marked `embeddings_generated: true` but `fathom_embeddings` table is EMPTY.

**Root Cause:** The function had a bug where it marked success even when ALL chunks failed to generate.

## The Fix
✅ Fixed the bug - function now only marks complete if embeddings are actually created
✅ Reset the recording to `embeddings_generated: false` 
✅ Ready to regenerate

## REGENERATE NOW - Browser Console Method

1. Open your client page in the browser
2. Open Developer Console (F12)
3. Paste and run this code:

```javascript
const supabaseUrl = 'https://dxfagynvuqjdzbgroivu.supabase.co';
const recordingId = 'c458871e-9fcb-4543-af9a-539dbc963529';

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(`${supabaseUrl}/functions/v1/process-fathom-embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recording_id: recordingId })
  });

  const result = await response.json();
  console.log('✅ Result:', result);
  
  // Expected: { success: true, embeddings_created: 6-7, chunks_total: 6-7 }
})();
```

4. Check the console output
5. Should see: `embeddings_created: 6` or `7`

## Verify It Worked

Run this SQL:

```sql
SELECT COUNT(*) as embedding_count 
FROM fathom_embeddings 
WHERE recording_id = 'c458871e-9fcb-4543-af9a-539dbc963529';
```

Should return: `6` or `7` (not 0!)

## Test Intelligence Agent

1. Go to client's Intelligence Agent
2. Ask: "What was discussed in recent meetings?"
3. Should cite the SOS meeting with speaker names
4. Metadata should show `fathomTranscriptsFound > 0`

## Alternative: Re-Sync from UI

Go to Data Sources → Fathom Sync → paste the meeting link again. It will auto-regenerate.
