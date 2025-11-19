import { useState } from 'react';
import { Globe, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface FirecrawlScraperProps {
  onDataExtracted?: (data: any) => void;
}

export function FirecrawlScraper({ onDataExtracted }: FirecrawlScraperProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-with-firecrawl`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'html'],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape website');
      }

      setResult(data.data);
      if (onDataExtracted) {
        onDataExtracted(data.data);
      }
    } catch (err) {
      console.error('Scraping error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scrape website');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleScrape}
          disabled={loading || !url.trim()}
          variant="primary"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              Scrape Website
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-green-900">Content Extracted Successfully</h4>
          </div>

          {result.markdown && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-800">Preview:</p>
              <div className="max-h-48 overflow-y-auto bg-white p-3 rounded border border-green-200 text-sm text-gray-700">
                {result.markdown.substring(0, 500)}...
              </div>
              <p className="text-xs text-green-700">
                {result.markdown.length} characters extracted
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
