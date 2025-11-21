import { supabase } from '../lib/supabase';

export async function regenerateFathomEmbeddings(recordingId: string, forceRegenerate = true): Promise<{
  success: boolean;
  embeddings_created?: number;
  chunks_total?: number;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-fathom-embeddings`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recording_id: recordingId,
        force_regenerate: forceRegenerate,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to regenerate embeddings');
    }

    return result;
  } catch (error) {
    console.error('Error regenerating embeddings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function regenerateAllFathomEmbeddings(): Promise<{
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: Array<{ title: string; success: boolean; error?: string }>;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Fetch all recordings
    const { data: recordings, error: fetchError } = await supabase
      .from('fathom_recordings')
      .select('id, title, embeddings_generated')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!recordings || recordings.length === 0) {
      return {
        success: true,
        total: 0,
        processed: 0,
        failed: 0,
        results: [],
      };
    }

    const results: Array<{ title: string; success: boolean; error?: string }> = [];
    let processed = 0;
    let failed = 0;

    for (const recording of recordings) {
      const result = await regenerateFathomEmbeddings(recording.id, true);

      if (result.success) {
        processed++;
        results.push({
          title: recording.title,
          success: true,
        });
      } else {
        failed++;
        results.push({
          title: recording.title,
          success: false,
          error: result.error,
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      total: recordings.length,
      processed,
      failed,
      results,
    };
  } catch (error) {
    console.error('Error regenerating all embeddings:', error);
    return {
      success: false,
      total: 0,
      processed: 0,
      failed: 0,
      results: [],
    };
  }
}
