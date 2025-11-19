# Fathom UI Integration Guide

## Where to Find Fathom Integration

### Location in App
1. Navigate to any Client
2. Click on **"Intelligence & Assets"** tab
3. Scroll down to see **"Fathom Meeting Recordings"** section

---

## UI Components

### 1. Fathom Sync Panel

**Features:**
- **Folder Link Input** - Paste Fathom folder URL
- **Filter Controls** - Toggle button to show/hide filters
  - **Team Filters**: Customer Success, Executive, Sales
  - **Meeting Type Filters**: Client Engagement, Sales Initial Call, Client Call
- **Sync Button** - Initiates the sync process
- **Status Messages** - Shows success/error feedback

**How to Use:**
1. Paste a Fathom folder link (e.g., `https://app.fathom.video/folders/abc123`)
2. Optional: Click settings icon to configure filters
3. Select which teams and meeting types to sync
4. Click "Sync Fathom" button
5. Wait for success message showing count of synced recordings

**Example Filters:**
```
Team Filters (optional):
☑ Customer Success
☐ Executive
☑ Sales

Meeting Type Filters (optional):
☑ Client Engagement
☐ Sales Initial Call
☑ Client Call
```

Result: Only syncs recordings from Customer Success or Sales teams that are tagged as "Client Engagement" or "Client Call"

---

### 2. Synced Recordings View

**When recordings exist:**
- A **"View (N)"** button appears in the card header
- Click to toggle between sync form and recordings list

**Recording Card Display:**

Each recording shows:

#### Header Section
- **Meeting Title** (bold, prominent)
- **Date & Time** - When the meeting occurred
- **Duration** - Meeting length in minutes
- **Team Badge** - Which team recorded it (if filtered)
- **Meeting Type Badge** - Type of meeting (if filtered)
- **"Indexed" Badge** - Green badge when embeddings are generated

#### Summary Section
- **AI-Generated Summary** - Brief overview of meeting

#### Participants Section
- **Participant Names** - Who attended the meeting
- Shows names with user icon

#### Action Items Section
- **Action Items List** - Tasks identified in meeting
- Shows first 3 items
- "+N more" indicator for additional items

#### Topics Section
- **Topic Tags** - Keywords extracted from conversation
- Shows up to 5 topics as badges

#### Sentiment Analysis
- **Visual Sentiment Bar**
  - Green (>60%) = Positive sentiment
  - Yellow (40-60%) = Neutral sentiment
  - Red (<40%) = Negative sentiment
- **Percentage Score** - Numeric sentiment value

#### Footer
- **"View in Fathom" Link** - Opens recording in Fathom app

---

## User Workflows

### First-Time Setup

**Step 1: Configure API Key**
1. Navigate to Settings → API Keys
2. Add your Fathom API key
3. Get key from: https://app.fathom.video/settings/integrations

**Step 2: Sync First Recordings**
1. Go to Client → Intelligence & Assets
2. Find "Fathom Meeting Recordings" card
3. Paste folder link
4. Click "Sync Fathom"
5. Wait for success message

**Step 3: View Synced Recordings**
1. Click "View (N)" button
2. Browse through synced recordings
3. Click "View in Fathom" to see original

---

### Regular Usage

**Syncing New Recordings:**
1. Return to sync form (click "← Back to Sync" if viewing recordings)
2. Paste new folder link or same folder for updates
3. System automatically skips duplicates
4. Only new recordings are synced

**Viewing Recordings:**
1. Click "View (N)" to see all synced recordings
2. Review summaries, action items, and topics
3. Check sentiment scores to gauge meeting tone
4. Click through to Fathom for full playback

**Using Filters:**
1. Click settings icon on sync form
2. Select relevant teams
3. Select relevant meeting types
4. Only matching recordings will sync
5. Saves time and keeps data clean

---

## Visual Examples

### Empty State (No Recordings Yet)
```
╔════════════════════════════════════════════╗
║  Fathom Meeting Recordings                ║
╠════════════════════════════════════════════╣
║                                            ║
║  Fathom Folder Link or Recording IDs      ║
║  [https://app.fathom.video/folders/...] ⚙ ║
║                                            ║
║  [           Sync Fathom            ]      ║
║                                            ║
║  ℹ How it works:                           ║
║  • Paste a Fathom folder link             ║
║  • Apply team and meeting type filters    ║
║  • Transcripts are automatically processed║
║                                            ║
╚════════════════════════════════════════════╝
```

### After Syncing (With Recordings)
```
╔════════════════════════════════════════════╗
║  Fathom Meeting Recordings    [View (5)]  ║
╠════════════════════════════════════════════╣
║                                            ║
║  Fathom Folder Link or Recording IDs      ║
║  [https://app.fathom.video/folders/...] ⚙ ║
║                                            ║
║  [           Sync Fathom            ]      ║
║                                            ║
║  ✓ Successfully synced 3 recordings from  ║
║    Fathom                                 ║
║    Embeddings are being generated...      ║
║                                            ║
╚════════════════════════════════════════════╝
```

### Viewing Synced Recordings
```
╔════════════════════════════════════════════╗
║  Fathom Meeting Recordings      [Hide]    ║
╠════════════════════════════════════════════╣
║                                            ║
║  [← Back to Sync]                          ║
║                                            ║
║  ┌──────────────────────────────────────┐ ║
║  │ Q4 Planning Review                   │ ║
║  │ November 15, 2024, 2:00 PM • 45 min │ ║
║  │ [Sales] [Client Engagement] [Indexed]│ ║
║  │                                      │ ║
║  │ Discussed Q4 goals, budget review,  │ ║
║  │ and resource allocation needs...     │ ║
║  │                                      │ ║
║  │ 👥 John Smith, Jane Doe, Bob Chen    │ ║
║  │                                      │ ║
║  │ Action Items:                        │ ║
║  │ • Follow up on budget approval       │ ║
║  │ • Schedule resource planning mtg     │ ║
║  │ • +2 more                            │ ║
║  │                                      │ ║
║  │ [Budget] [Resources] [Q4] [Planning] │ ║
║  │                                      │ ║
║  │ Sentiment: ████████░░ 85%            │ ║
║  │                                      │ ║
║  │ 👁 View in Fathom                    │ ║
║  └──────────────────────────────────────┘ ║
║                                            ║
║  [... more recordings ...]                ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

## Integration with Other Features

### AI Insights Generation
When you click **"Generate AI Insights"** on the Overview tab, the system now includes:
- Recent Fathom meeting summaries (last 90 days)
- Meeting topics and keywords
- Action items from recordings
- Sentiment scores
- Participant information

This enriches the AI analysis with real conversation context.

### Pitch Generation
When generating pitches, the AI can reference:
- Specific discussions from Fathom recordings
- Client concerns mentioned in meetings
- Positive feedback and enthusiasm
- Technical requirements discussed
- Next steps identified in calls

### Semantic Search
The Intelligence Agent can search across:
- All document content
- Meeting transcripts (both manual and Fathom)
- Client notes
- Website/blog content

Ask questions like:
- "What concerns did they raise about pricing?"
- "What features did they request?"
- "How do they feel about our proposal?"

---

## Status Indicators

### Sync Status
- **"Syncing..."** - Fetching recordings from Fathom
- **"✓ Successfully synced N recordings"** - Sync completed
- **"✗ Error message"** - Sync failed with reason

### Recording Status
- **"Indexed" Badge (Green)** - Embeddings generated, searchable
- **No badge** - Still processing embeddings
- **Team Badge** - Shows which team recorded
- **Meeting Type Badge** - Shows meeting category

### Sentiment Colors
- **Green Bar** - Positive meeting sentiment (>60%)
- **Yellow Bar** - Neutral sentiment (40-60%)
- **Red Bar** - Negative or concerning sentiment (<40%)

---

## Troubleshooting UI Issues

### "Fathom API key not configured" Error
**Solution:**
1. Go to Settings → API Keys
2. Add Fathom API key
3. Return to client page and try again

### "No recordings found to sync" Message
**Possible Causes:**
- Folder is empty in Fathom
- Filters are too restrictive
- Invalid folder link

**Solution:**
- Verify folder has recordings in Fathom app
- Remove or adjust team/meeting type filters
- Check folder link format

### Recordings Not Showing After Sync
**Solution:**
- Click "View (N)" button to toggle view
- Refresh page to ensure data loaded
- Check browser console for errors

### "Embeddings are being generated" Never Completes
**Expected Behavior:**
- Background process takes 1-5 minutes
- Page doesn't auto-refresh when complete
- Reload page or re-open client to see "Indexed" badge

---

## Best Practices

### Organizing Recordings
1. **Use Folders in Fathom** - Group recordings by client
2. **Apply Team Tags** - Tag who led the meeting
3. **Set Meeting Types** - Categorize the meeting purpose
4. **Regular Syncs** - Sync after each client meeting

### Filtering Strategy
1. **Start Broad** - First sync without filters
2. **Review Results** - See what comes through
3. **Refine Filters** - Apply team/type filters if needed
4. **Incremental Syncs** - Re-sync same folder for updates

### Using Insights
1. **Review Before Calls** - Check past meeting summaries
2. **Track Sentiment** - Watch for declining sentiment
3. **Follow Action Items** - Reference previous commitments
4. **Reference Topics** - See what matters to client

---

## Future Enhancements

### Planned Features
- [ ] Inline transcript search
- [ ] Export recordings to PDF
- [ ] Meeting playback with timestamp links
- [ ] Automatic scheduled syncs
- [ ] Sentiment trend charts
- [ ] Action item tracking/completion
- [ ] Participant analysis

---

## Summary

The Fathom integration is now **fully visible and functional** in the UI:

✅ **Sync Form** - Easy folder link pasting
✅ **Filter Controls** - Team and meeting type filtering
✅ **Status Feedback** - Clear success/error messages
✅ **Recording Cards** - Rich display of meeting data
✅ **Sentiment Visualization** - Color-coded sentiment bars
✅ **Fathom Links** - Direct access to original recordings
✅ **View Toggle** - Switch between sync and viewing
✅ **Integration** - Works with AI insights and search

**Location:** Client → Intelligence & Assets → Fathom Meeting Recordings

**Next Steps:**
1. Add Fathom API key in Settings
2. Navigate to a client
3. Go to Intelligence & Assets tab
4. Try syncing a folder!
