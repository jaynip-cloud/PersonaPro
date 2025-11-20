# Regenerate Fathom Embeddings - DO THIS NOW

## The Problem
Recording is marked `embeddings_generated: true` but `fathom_embeddings` table is EMPTY.

**Root Cause:** The function had a bug where it marked success even when ALL chunks failed to generate.

## The Fix
✅ Fixed the bug - function now only marks complete if embeddings are actually created
✅ Reset the recording to `embeddings_generated: false` 
✅ Ready to regenerate

## REGENERATE NOW - Browser Console Method

1. **Make sure you're logged in to the app**
2. Open your client page in the browser
3. Open Developer Console (F12)
4. Paste and run this code:

```javascript
// Import Supabase from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
document.head.appendChild(script);

script.onload = async () => {
  const { createClient } = supabase;
  const supabaseUrl = 'https://dxfagynvuqjdzbgroivu.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZmFneW52dXFqZHpiZ3JvaXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MDU2NzgsImV4cCI6MjA3NzQ4MTY3OH0.z9jxvkliQZN59mM0RCkbMnfDL-k4R13N5ezE6JB2Aig';
  const recordingId = 'c458871e-9fcb-4543-af9a-539dbc963529';

  const client = createClient(supabaseUrl, supabaseKey);
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    console.error('❌ Not logged in! Please log in first.');
    return;
  }

  console.log('🔄 Generating embeddings... (this may take 30 seconds)');

  const response = await fetch(`${supabaseUrl}/functions/v1/process-fathom-embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recording_id: recordingId })
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`   Created ${result.embeddings_created} embeddings`);
    console.log(`   From ${result.chunks_total} chunks`);
    console.log('\n🎉 Intelligence Agent can now read Fathom meetings!');
  } else {
    console.error('❌ FAILED:', result.error);
  }
};
```

5. **Wait 20-30 seconds** - it's calling OpenAI to generate embeddings for 6-7 chunks
6. Should see: `✅ SUCCESS! Created 6 embeddings`

## Verify It Worked

Check the database (Settings → Database or Supabase dashboard):

```sql
SELECT COUNT(*) as embedding_count 
FROM fathom_embeddings 
WHERE recording_id = 'c458871e-9fcb-4543-af9a-539dbc963529';
```

Should return: **6 or 7** (not 0!)

## Test Intelligence Agent

1. Go to client's **Intelligence Agent** tab
2. Ask: **"What was discussed in recent meetings?"**
3. Should see:
   - ✅ Answer citing the SOS Biweekly Meeting
   - ✅ Speaker names (Jessica Wagner, Aagna Paneri, etc.)
   - ✅ Metadata showing `fathomTranscriptsFound: 6` or `7`

## Alternative: Re-Sync from UI (Simpler but Slower)

1. Go to **Data Sources** tab
2. Click **Fathom Sync** section
3. Paste the same meeting link again
4. System will auto-regenerate embeddings

This is easier but requires you to have the original link.

## What Changed

1. **Bug Fix**: Function returns error if NO embeddings created (was marking success before)
2. **Chunking Fix**: Properly splits at 6000 chars (was 36K single chunk)
3. **Status Check**: Only marks `embeddings_generated: true` if successful
4. **Search Integration**: Intelligence Agent uses `match_all_content()` to search Fathom data

All deployed and ready! Just run the console code above.
