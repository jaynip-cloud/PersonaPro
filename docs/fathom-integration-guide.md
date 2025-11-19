# Fathom Integration Guide

## Overview
This guide explains how to integrate Fathom's meeting recorder to automatically gather meeting transcripts and summaries for each client.

---

## Architecture Overview

```
Fathom Meeting Recording
    ↓
Fathom API (transcripts, summaries, action items)
    ↓
Webhook/Polling → Edge Function
    ↓
Process & Store in database (meeting_transcripts table)
    ↓
Generate Embeddings → Vector Search
    ↓
Client Intelligence & AI Insights
```

---

## Integration Strategy

### **Two Approaches:**

### 1. **Webhook-Based (Recommended - Real-time)**
Fathom triggers webhook when meeting ends → instant transcript sync

### 2. **Polling-Based (Fallback - Scheduled)**
Periodically check Fathom API for new meetings → batch import

---

## Prerequisites

### 1. **Fathom Account**
- Sign up at https://www.fathom.ai/
- Subscribe to plan with API access

### 2. **Fathom API Key**
- Navigate to Settings → Integrations → API
- Generate API key
- Store securely in database `api_keys` table

### 3. **Database Schema**
Already exists: `meeting_transcripts` table

```sql
meeting_transcripts:
  - id (uuid)
  - user_id (uuid) → references auth.users
  - client_id (uuid) → references clients
  - title (text)
  - transcript (text)
  - meeting_date (date)
  - fathom_meeting_id (text) → NEW FIELD NEEDED
  - fathom_share_url (text) → NEW FIELD NEEDED
  - summary (text) → NEW FIELD NEEDED
  - action_items (jsonb) → NEW FIELD NEEDED
  - participants (jsonb) → NEW FIELD NEEDED
  - sentiment_analysis (jsonb) → NEW FIELD NEEDED
  - created_at (timestamptz)
  - updated_at (timestamptz)
```

---

## Implementation Steps

### **Step 1: Update Database Schema**

Create migration to add Fathom-specific fields:

```sql
-- Add Fathom fields to meeting_transcripts
ALTER TABLE meeting_transcripts
  ADD COLUMN IF NOT EXISTS fathom_meeting_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS fathom_share_url text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sentiment_analysis jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS recording_url text;

-- Create index for Fathom ID lookups
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_fathom_id
  ON meeting_transcripts(fathom_meeting_id);

-- Add API key field for Fathom
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS fathom_api_key text;
```

---

### **Step 2: Store Fathom API Key**

Add UI in Settings page to save Fathom API key:

```typescript
// Frontend: src/pages/Settings.tsx
const [fathomApiKey, setFathomApiKey] = useState('');

const saveFathomKey = async () => {
  const { error } = await supabase
    .from('api_keys')
    .upsert({
      user_id: user.id,
      fathom_api_key: fathomApiKey,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving Fathom API key:', error);
  } else {
    alert('Fathom API key saved successfully!');
  }
};
```

---

### **Step 3: Create Edge Function - Sync Fathom Meetings**

**File:** `supabase/functions/sync-fathom-meetings/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FathomMeeting {
  id: string;
  title: string;
  recordingStartedAt: string;
  recordingEndedAt: string;
  shareUrl: string;
  recordingUrl?: string;
  transcript?: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
  summary?: string;
  actionItems?: Array<{
    text: string;
    assignee?: string;
  }>;
  calendarInvitees?: Array<{
    email: string;
    name?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's Fathom API key
    const { data: apiKeys, error: keysError } = await supabaseClient
      .from('api_keys')
      .select('fathom_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.fathom_api_key) {
      throw new Error('Fathom API key not configured');
    }

    const body = await req.json();
    const { client_id, created_after } = body;

    // Fetch meetings from Fathom API
    const fathomUrl = new URL('https://api.fathom.ai/external/v1/meetings');

    if (created_after) {
      fathomUrl.searchParams.append('created_after', created_after);
    }

    // Include all relevant data
    fathomUrl.searchParams.append('include_transcript', 'true');
    fathomUrl.searchParams.append('include_summary', 'true');
    fathomUrl.searchParams.append('include_action_items', 'true');

    const fathomResponse = await fetch(fathomUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKeys.fathom_api_key,
        'Content-Type': 'application/json',
      },
    });

    if (!fathomResponse.ok) {
      const errorText = await fathomResponse.text();
      throw new Error(`Fathom API error: ${errorText}`);
    }

    const fathomData = await fathomResponse.json();
    const meetings: FathomMeeting[] = fathomData.items || [];

    console.log(`Found ${meetings.length} meetings from Fathom`);

    // Process each meeting
    const processedMeetings = [];

    for (const meeting of meetings) {
      // Combine transcript into single text
      const fullTranscript = meeting.transcript
        ?.map(t => `${t.speaker}: ${t.text}`)
        .join('\n\n') || '';

      // Calculate duration
      const startTime = new Date(meeting.recordingStartedAt).getTime();
      const endTime = new Date(meeting.recordingEndedAt).getTime();
      const durationMinutes = Math.round((endTime - startTime) / 60000);

      // Extract participant info
      const participants = meeting.calendarInvitees?.map(inv => ({
        email: inv.email,
        name: inv.name || '',
      })) || [];

      // Format action items
      const actionItems = meeting.actionItems?.map(item => ({
        text: item.text,
        assignee: item.assignee || '',
        completed: false,
      })) || [];

      // Check if meeting already exists
      const { data: existingMeeting } = await supabaseClient
        .from('meeting_transcripts')
        .select('id')
        .eq('fathom_meeting_id', meeting.id)
        .maybeSingle();

      if (existingMeeting) {
        console.log(`Meeting ${meeting.id} already exists, skipping`);
        continue;
      }

      // Insert meeting transcript
      const { data: insertedMeeting, error: insertError } = await supabaseClient
        .from('meeting_transcripts')
        .insert({
          user_id: user.id,
          client_id: client_id,
          fathom_meeting_id: meeting.id,
          title: meeting.title || 'Untitled Meeting',
          transcript: fullTranscript,
          summary: meeting.summary || '',
          meeting_date: new Date(meeting.recordingStartedAt).toISOString().split('T')[0],
          fathom_share_url: meeting.shareUrl,
          recording_url: meeting.recordingUrl,
          action_items: actionItems,
          participants: participants,
          duration_minutes: durationMinutes,
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting meeting ${meeting.id}:`, insertError);
        continue;
      }

      processedMeetings.push(insertedMeeting);

      // Generate embeddings for transcript
      if (fullTranscript) {
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/vectorize-meeting-transcript`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transcript_id: insertedMeeting.id,
              client_id: client_id,
            }),
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetings_synced: processedMeetings.length,
        meetings: processedMeetings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in sync-fathom-meetings:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

### **Step 4: Create Webhook Handler (Optional - for Real-time)**

**File:** `supabase/functions/fathom-webhook/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Webhook verification (if Fathom supports it)
    const webhookSecret = Deno.env.get('FATHOM_WEBHOOK_SECRET');
    const signature = req.headers.get('X-Fathom-Signature');

    // TODO: Verify webhook signature if available

    const payload = await req.json();

    // Webhook payload will contain meeting ID
    const { meeting_id, event_type, user_email } = payload;

    if (event_type !== 'meeting.completed') {
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, api_keys!inner(fathom_api_key)')
      .eq('email', user_email)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('User not found:', user_email);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch meeting details from Fathom
    const fathomResponse = await fetch(
      `https://api.fathom.ai/external/v1/meetings/${meeting_id}`,
      {
        headers: {
          'X-Api-Key': profile.api_keys.fathom_api_key,
        },
      }
    );

    if (!fathomResponse.ok) {
      throw new Error('Failed to fetch meeting from Fathom');
    }

    const meeting = await fathomResponse.json();

    // Process and store meeting (similar to sync function)
    // ... (insert logic here)

    return new Response(
      JSON.stringify({ success: true, meeting_id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in fathom-webhook:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

---

### **Step 5: Frontend Integration**

**Add Fathom Sync Button to Client Detail Page:**

```typescript
// src/pages/ClientDetailNew.tsx

const syncFathomMeetings = async () => {
  setSyncingFathom(true);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-fathom-meetings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.auth.session()?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          created_after: lastSyncDate || null,
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      toast.success(`Synced ${result.meetings_synced} meetings from Fathom`);
      // Refresh meeting list
      loadMeetingTranscripts();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error syncing Fathom meetings:', error);
    toast.error('Failed to sync Fathom meetings');
  } finally {
    setSyncingFathom(false);
  }
};

// UI Button
<Button
  onClick={syncFathomMeetings}
  disabled={syncingFathom}
>
  <RefreshCw className={syncingFathom ? 'animate-spin' : ''} />
  Sync Fathom Meetings
</Button>
```

---

### **Step 6: Automated Sentiment Analysis**

Create edge function to analyze meeting sentiment:

```typescript
// supabase/functions/analyze-meeting-sentiment/index.ts

const analyzeSentiment = async (transcript: string, openaiKey: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing meeting transcripts for sentiment, engagement, and key insights.',
        },
        {
          role: 'user',
          content: `Analyze this meeting transcript and provide:
1. Overall sentiment (positive/neutral/negative)
2. Sentiment score (0-100)
3. Client engagement level (low/medium/high)
4. Key concerns or objections raised
5. Positive indicators (interest, commitment, enthusiasm)
6. Next steps or action items
7. Relationship health score (0-100)

Transcript:
${transcript}

Return JSON format:
{
  "overall_sentiment": "positive",
  "sentiment_score": 85,
  "engagement_level": "high",
  "concerns": ["concern 1", "concern 2"],
  "positive_indicators": ["indicator 1", "indicator 2"],
  "next_steps": ["step 1", "step 2"],
  "relationship_health_score": 90,
  "reasoning": "Brief explanation of scores"
}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Records   │
│ Meeting in      │
│    Fathom       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fathom Processes│
│  - Transcription│
│  - AI Summary   │
│  - Action Items │
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌──────────────────┐
│  Webhook/Poll   │──────▶│  Edge Function   │
│   Triggered     │       │ sync-fathom-     │
└─────────────────┘       │   meetings       │
                          └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │ Store in DB:     │
                          │ meeting_         │
                          │ transcripts      │
                          └────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
         ┌────────────────────┐      ┌──────────────────┐
         │ Generate Vector    │      │ Analyze Sentiment│
         │   Embeddings       │      │  with OpenAI     │
         └────────┬───────────┘      └────────┬─────────┘
                  │                           │
                  ▼                           ▼
         ┌────────────────────┐      ┌──────────────────┐
         │ document_          │      │ Update sentiment_│
         │  embeddings        │      │   analysis field │
         └────────────────────┘      └──────────────────┘
                  │                           │
                  └──────────┬────────────────┘
                             │
                             ▼
                  ┌──────────────────┐
                  │  Available in:   │
                  │ - Client Detail  │
                  │ - AI Insights    │
                  │ - Pitch Generator│
                  └──────────────────┘
```

---

## User Workflows

### **Workflow 1: Manual Sync After Meeting**

1. User has meeting with client
2. Fathom records and processes meeting
3. User opens client detail page
4. User clicks "Sync Fathom Meetings" button
5. System fetches recent meetings from Fathom
6. Meetings auto-assigned to current client
7. Transcripts vectorized for AI search
8. Sentiment analysis generated automatically

### **Workflow 2: Automatic Sync (Scheduled)**

1. Set up cron job (via Supabase Edge Function cron or external)
2. Every 1 hour: call `sync-fathom-meetings` for all users
3. Fetch meetings created in last 2 hours
4. Auto-match meetings to clients based on:
   - Calendar invitee email domains
   - Participant email addresses
   - Meeting title mentions
5. Process and store automatically

### **Workflow 3: Webhook-Based (Real-time)**

1. Configure Fathom webhook URL in Fathom settings
2. Point to: `https://[project].supabase.co/functions/v1/fathom-webhook`
3. When meeting ends, Fathom triggers webhook
4. System processes meeting immediately
5. Notification sent to user

---

## Client Matching Logic

**How to link Fathom meetings to specific clients:**

```typescript
// Matching strategies:

// 1. Match by email domain
const matchByEmailDomain = (meeting, clients) => {
  const inviteeEmails = meeting.calendarInvitees.map(inv => inv.email);
  const domains = inviteeEmails.map(email => email.split('@')[1]);

  return clients.find(client => {
    const clientDomain = new URL(client.website).hostname.replace('www.', '');
    return domains.some(domain => domain === clientDomain);
  });
};

// 2. Match by contact email
const matchByContactEmail = (meeting, clients) => {
  const inviteeEmails = meeting.calendarInvitees.map(inv => inv.email);

  return clients.find(client => {
    return client.contacts?.some(contact =>
      inviteeEmails.includes(contact.email)
    );
  });
};

// 3. Match by meeting title (contains client name)
const matchByTitle = (meeting, clients) => {
  const title = meeting.title.toLowerCase();

  return clients.find(client =>
    title.includes(client.name.toLowerCase())
  );
};

// Combined matching
const matchMeetingToClient = (meeting, clients) => {
  return matchByContactEmail(meeting, clients)
    || matchByEmailDomain(meeting, clients)
    || matchByTitle(meeting, clients)
    || null; // Manual assignment needed
};
```

---

## Features Enabled by Fathom Integration

### **1. Meeting Intelligence**
- Full searchable transcript archive
- AI-generated summaries
- Automatic action item tracking
- Speaker identification

### **2. Client Insights**
- Sentiment tracking over time
- Engagement level monitoring
- Concern/objection patterns
- Relationship health scoring

### **3. Pitch Enhancement**
- Reference specific meeting discussions
- Address concerns raised in calls
- Highlight positive feedback
- Show understanding of client needs

### **4. Growth Opportunities**
- Identify upsell signals from conversations
- Detect expansion opportunities
- Track feature requests
- Monitor satisfaction indicators

### **5. Team Collaboration**
- Shareable meeting links
- Searchable knowledge base
- Onboarding context for new team members
- Historical client relationship view

---

## Security Considerations

1. **API Key Storage**
   - Store Fathom API keys encrypted in database
   - Never expose in frontend code
   - Use environment variables for webhook secrets

2. **Access Control**
   - RLS policies ensure users only see their meetings
   - Client-specific access controls
   - Team-based sharing permissions

3. **Data Privacy**
   - GDPR compliance: allow meeting deletion
   - Client consent for recording
   - Secure transcript storage
   - No third-party sharing without consent

4. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS only
   - Rate limiting
   - IP allowlist (if Fathom supports)

---

## Cost Considerations

- **Fathom Subscription**: Required for API access
- **OpenAI API**: Sentiment analysis, embeddings generation
- **Supabase Storage**: Transcript text storage (minimal)
- **pgvector**: Vector storage for embeddings

**Estimated Costs:**
- 10 meetings/day × 30 days = 300 meetings/month
- ~50KB per transcript = 15MB storage
- ~1500 tokens per transcript for sentiment = $0.015/meeting
- **Total: ~$4.50/month for AI processing + Fathom subscription**

---

## Summary

**Integration Components:**
1. ✅ Database schema with Fathom fields
2. ✅ API key storage in settings
3. ✅ Edge function to sync meetings
4. ✅ Edge function for webhook handling
5. ✅ Frontend sync button
6. ✅ Automatic client matching
7. ✅ Vector embeddings generation
8. ✅ Sentiment analysis with AI
9. ✅ Meeting transcript search
10. ✅ Integration with pitch generator

**Next Steps:**
1. Add Fathom API key field to `api_keys` table
2. Create `sync-fathom-meetings` edge function
3. Add sync button to client detail page
4. Configure automatic matching logic
5. Enable sentiment analysis
6. Set up scheduled sync (optional)
7. Configure webhook endpoint (optional)

This integration transforms Fathom meeting recordings into actionable client intelligence that powers better pitches, deeper insights, and stronger relationships.
