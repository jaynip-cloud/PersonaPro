import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TechnologyData {
  techStack: string[];
  partners: string[];
  integrations: string[];
}

interface AITechnologyExtractorProps {
  onDataExtracted: (data: TechnologyData) => void;
}

export function AITechnologyExtractor({ onDataExtracted }: AITechnologyExtractorProps) {
  const [url, setUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedCounts, setExtractedCounts] = useState({ techStack: 0, partners: 0, integrations: 0 });

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setExtracting(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-technology`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract technology data');
      }

      const data = await response.json();

      const totalExtracted =
        (data.techStack?.length || 0) +
        (data.partners?.length || 0) +
        (data.integrations?.length || 0);

      if (totalExtracted > 0) {
        const counts = {
          techStack: data.techStack?.length || 0,
          partners: data.partners?.length || 0,
          integrations: data.integrations?.length || 0
        };

        setExtractedCounts(counts);
        onDataExtracted({
          techStack: data.techStack || [],
          partners: data.partners || [],
          integrations: data.integrations || [],
        });
        setSuccess(true);
        setUrl('');

        console.log('Extracted technology data:', counts);

        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError('No technology information found on the provided page. Try a different URL like your about page, technology page, or careers page.');
      }
    } catch (err: any) {
      console.error('Error extracting technology:', err);
      setError(err.message || 'Failed to extract technology data. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://example.com/about or https://example.com/technology"
            className="pl-10"
            disabled={extracting}
          />
        </div>
        <Button
          variant="primary"
          onClick={handleExtract}
          disabled={extracting || !url.trim()}
        >
          {extracting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Extract Tech Info
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Success!</p>
            <p className="text-sm text-green-700">
              Extracted {extractedCounts.techStack} technologies, {extractedCounts.partners} partners, and {extractedCounts.integrations} integrations
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">How it works:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Enter the URL of your technology, about, or company page</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>AI will analyze the page and extract technology stack, partners, and integrations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Looks for programming languages, frameworks, cloud providers, and tools</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Identifies business partnerships and third-party integrations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Extracted items will be added to the lists below</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
