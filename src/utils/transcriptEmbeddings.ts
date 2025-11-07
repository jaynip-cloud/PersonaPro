import { supabase } from '../lib/supabase';

export interface VectorizeTranscriptOptions {
  clientId?: string;
}

/**
 * Vectorize a meeting transcript by generating embeddings and storing them
 * @param transcriptId - The ID of the meeting transcript to vectorize
 * @param options - Optional client ID
 */
export async function vectorizeMeetingTranscript(
  transcriptId: string,
  options: VectorizeTranscriptOptions = {}
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vectorize-meeting-transcript`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptId,
        clientId: options.clientId,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to vectorize meeting transcript');
  }

  const result = await response.json();
  return result;
}

/**
 * Vectorize all meeting transcripts for a specific client
 * @param clientId - The ID of the client
 */
export async function vectorizeAllClientTranscripts(clientId: string): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  // Fetch all transcripts for the client
  const { data: transcripts, error } = await supabase
    .from('meeting_transcripts')
    .select('id, title')
    .eq('client_id', clientId)
    .eq('user_id', session.user.id);

  if (error) {
    throw new Error('Failed to fetch transcripts');
  }

  if (!transcripts || transcripts.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Vectorize each transcript
  for (const transcript of transcripts) {
    try {
      await vectorizeMeetingTranscript(transcript.id, { clientId });
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${transcript.title || transcript.id}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Check if a transcript has been vectorized
 * @param transcriptId - The ID of the meeting transcript
 */
export async function isTranscriptVectorized(transcriptId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('document_embeddings')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('source_type', 'meeting_transcript')
    .eq('metadata->>transcript_id', transcriptId)
    .limit(1);

  if (error) {
    console.error('Error checking vectorization status:', error);
    return false;
  }

  return (data && data.length > 0) || false;
}

