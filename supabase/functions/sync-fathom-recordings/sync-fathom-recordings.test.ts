import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";

Deno.test("URL detection - share link", () => {
  const isShareOrCallUrl = (url: string): boolean => {
    return /\/(share|calls|recordings)\/[A-Za-z0-9_-]+/.test(url);
  };

  assertEquals(isShareOrCallUrl("https://fathom.video/share/o4yiQbS_sLSJksuGQH8SY_yqpDmqVse4"), true);
  assertEquals(isShareOrCallUrl("https://fathom.video/calls/12345678"), true);
  assertEquals(isShareOrCallUrl("https://fathom.video/recordings/abc123"), true);
  assertEquals(isShareOrCallUrl("https://fathom.video/folders/xyz"), false);
});

Deno.test("URL detection - folder link", () => {
  const isFolderUrl = (url: string): boolean => {
    return /\/folders\/[A-Za-z0-9_-]+/.test(url);
  };

  assertEquals(isFolderUrl("https://fathom.video/folders/9xKjKmduTvRqzueyK7oTk5HgytqUpUxGTAuw"), true);
  assertEquals(isFolderUrl("https://fathom.video/share/o4yiQbS"), false);
});

Deno.test("Folder ID extraction", () => {
  const extractFolderId = (url: string): string | null => {
    const match = url.match(/\/folders\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  assertEquals(extractFolderId("https://fathom.video/folders/9xKjKmduTvRqzueyK7oTk5HgytqUpUxGTAuw"), "9xKjKmduTvRqzueyK7oTk5HgytqUpUxGTAuw");
  assertEquals(extractFolderId("https://fathom.video/share/abc"), null);
});

Deno.test("Exact URL matching - mock meetings API response", async () => {
  const mockMeetingsResponse = {
    items: [
      {
        recording_id: "480021577",
        share_url: "https://fathom.video/share/o4yiQbS_sLSJksuGQH8SY_yqpDmqVse4",
        url: "https://fathom.video/meetings/123",
        title: "Client Kickoff Meeting",
        transcript: { segments: [{ speaker: "John", text: "Hello world" }] },
        default_summary: { text: "Summary of the meeting" }
      },
      {
        recording_id: "480021578",
        share_url: "https://fathom.video/share/different_id",
        url: "https://fathom.video/meetings/456",
        title: "Another Meeting"
      }
    ]
  };

  const inputUrl = "https://fathom.video/share/o4yiQbS_sLSJksuGQH8SY_yqpDmqVse4";

  const matchedItem = mockMeetingsResponse.items.find(item =>
    item.share_url === inputUrl || item.url === inputUrl
  );

  assertExists(matchedItem);
  assertEquals(matchedItem?.recording_id, "480021577");
  assertEquals(matchedItem?.title, "Client Kickoff Meeting");
});

Deno.test("Conditional endpoint calling - transcript present", () => {
  const meetingItem = {
    recording_id: "123",
    transcript: { segments: [{ speaker: "John", text: "Hello" }] },
    default_summary: { text: "Summary" }
  };

  const hasTranscript = meetingItem.transcript && (
    typeof meetingItem.transcript === 'string' ||
    meetingItem.transcript.segments ||
    meetingItem.transcript.text
  );

  const hasSummary = meetingItem.default_summary && (
    typeof meetingItem.default_summary === 'string' ||
    meetingItem.default_summary.summary_text ||
    meetingItem.default_summary.text
  );

  assertEquals(hasTranscript, true, "Should detect transcript is present");
  assertEquals(hasSummary, true, "Should detect summary is present");
});

Deno.test("Conditional endpoint calling - transcript missing", () => {
  const meetingItem = {
    recording_id: "123",
    transcript: null,
    default_summary: null
  };

  const hasTranscript = meetingItem.transcript && (
    typeof meetingItem.transcript === 'string' ||
    meetingItem.transcript.segments ||
    meetingItem.transcript.text
  );

  const hasSummary = meetingItem.default_summary && (
    typeof meetingItem.default_summary === 'string' ||
    meetingItem.default_summary.summary_text ||
    meetingItem.default_summary.text
  );

  assertEquals(hasTranscript, false, "Should detect transcript is missing");
  assertEquals(hasSummary, false, "Should detect summary is missing");
});

Deno.test("Folder filtering - exact folder_id match", () => {
  const mockMeetingsResponse = {
    items: [
      { recording_id: "1", folder_id: "folder123", title: "Meeting 1" },
      { recording_id: "2", folder_id: "folder456", title: "Meeting 2" },
      { recording_id: "3", folder_id: "folder123", title: "Meeting 3" },
      { recording_id: "4", folder_id: null, title: "Meeting 4" }
    ]
  };

  const targetFolderId = "folder123";
  const folderItems = mockMeetingsResponse.items.filter(item => {
    const itemFolderId = String(item.folder_id || '');
    return itemFolderId === targetFolderId;
  });

  assertEquals(folderItems.length, 2);
  assertEquals(folderItems[0].recording_id, "1");
  assertEquals(folderItems[1].recording_id, "3");
});

Deno.test("Chunk array utility", () => {
  function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  const recordings = ["1", "2", "3", "4", "5", "6", "7"];
  const chunks = chunkArray(recordings, 3);

  assertEquals(chunks.length, 3);
  assertEquals(chunks[0], ["1", "2", "3"]);
  assertEquals(chunks[1], ["4", "5", "6"]);
  assertEquals(chunks[2], ["7"]);
});

Deno.test("No false positive IDs from garbage tokens", () => {
  const garbageTokens = new Set([
    'search', 'folder', 'page', 'null', 'undefined', 'true', 'false', 'query',
    'filter', 'sort', 'view', 'edit', 'delete', 'create', 'new', 'add',
    'settings', 'profile', 'dashboard', 'home', 'index', 'main', 'app',
    'recording', 'recordings', 'call', 'calls', 'meeting', 'meetings'
  ]);

  const suspiciousIds = ["search", "folder", "page", "recordings", "480021577", "abc123_xyz"];

  const cleanedIds = suspiciousIds.filter(id => {
    if (!id) return false;
    const trimmed = id.trim();

    if (garbageTokens.has(trimmed.toLowerCase())) {
      return false;
    }

    if (/^\d{6,}$/.test(trimmed)) {
      return true;
    }

    if (/^[A-Za-z0-9_-]{8,}$/.test(trimmed)) {
      return true;
    }

    return false;
  });

  assertEquals(cleanedIds.length, 2, "Should only accept valid IDs");
  assertEquals(cleanedIds.includes("search"), false);
  assertEquals(cleanedIds.includes("folder"), false);
  assertEquals(cleanedIds.includes("480021577"), true);
  assertEquals(cleanedIds.includes("abc123_xyz"), true);
});
