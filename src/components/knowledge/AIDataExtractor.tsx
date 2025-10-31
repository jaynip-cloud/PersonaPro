import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Plus, Trash2, Sparkles, Loader2, AlertCircle, CheckCircle, Link, FileText } from 'lucide-react';

interface AIDataExtractorProps {
  onDataExtracted: (data: any) => void;
}

export const AIDataExtractor: React.FC<AIDataExtractorProps> = ({ onDataExtracted }) => {
  const [urls, setUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addUrlField = () => {
    setUrls([...urls, '']);
  };

  const removeUrlField = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleExtract = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');

    if (validUrls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    const openaiKey = localStorage.getItem('openai_key');
    if (!openaiKey) {
      setError('Please configure your OpenAI API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/extract-company-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: validUrls,
          openaiKey: openaiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const data = await response.json();
      onDataExtracted(data);
      setSuccess(true);
      setUrls(['']);
    } catch (err: any) {
      setError(err.message || 'Failed to extract data');
      console.error('Error extracting data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-Powered Data Extraction</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Add URLs from your company website, LinkedIn, social media, or documents.
              AI will automatically extract company details, services, team information, case studies, and more.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              URLs to Analyze
            </label>
            {urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1 relative">
                  <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://example.com or https://linkedin.com/company/..."
                    className="pl-10"
                  />
                </div>
                {urls.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeUrlField(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addUrlField}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another URL
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">
                Data extracted successfully! Check the tabs above to review the information.
              </p>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleExtract}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting Data...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Extract Company Data
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">What can be extracted:</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Company profile',
                'Services offered',
                'Team members',
                'Case studies',
                'Blog posts',
                'Contact info',
                'Social profiles',
                'Mission & vision'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
