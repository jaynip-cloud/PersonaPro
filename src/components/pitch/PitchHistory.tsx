import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GeneratedPitch } from '../../types';
import { Clock, Eye, Trash2, Copy, Download } from 'lucide-react';

interface PitchHistoryProps {
  pitches: GeneratedPitch[];
  onView: (pitch: GeneratedPitch) => void;
  onDelete: (pitchId: string) => void;
}

export const PitchHistory: React.FC<PitchHistoryProps> = ({
  pitches,
  onView,
  onDelete
}) => {
  const [filter, setFilter] = useState<'all' | 'formal' | 'casual'>('all');

  const filteredPitches = pitches.filter(pitch => {
    if (filter === 'all') return true;
    return pitch.tone === filter;
  });

  const sortedPitches = [...filteredPitches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleCopy = (pitch: GeneratedPitch, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `
ELEVATOR PITCH
${pitch.elevatorPitch}

VALUE POINTS
${pitch.valuePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

NEXT ACTIONS
${pitch.nextActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  const handleExport = (pitch: GeneratedPitch, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `
PITCH FOR ${pitch.clientCompany.toUpperCase()}
Generated: ${new Date(pitch.createdAt).toLocaleString()}

CLIENT: ${pitch.clientName}
COMPANY: ${pitch.clientCompany}
SERVICES: ${pitch.services.join(', ')}
TONE: ${pitch.tone.toUpperCase()}

ELEVATOR PITCH
${pitch.elevatorPitch}

VALUE POINTS
${pitch.valuePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

SUGGESTED NEXT ACTIONS
${pitch.nextActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

CONFIDENCE SCORE: ${pitch.confidence}%
EVIDENCE TAGS: ${pitch.evidenceTags.join(', ')}
VARIANT: ${pitch.variant}
    `.trim();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pitch-${pitch.clientCompany.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (pitchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this pitch?')) {
      onDelete(pitchId);
    }
  };

  if (pitches.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Saved Pitches Yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate your first pitch to see it appear in your history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pitch History</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              All ({pitches.length})
            </button>
            <button
              onClick={() => setFilter('formal')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'formal'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Formal
            </button>
            <button
              onClick={() => setFilter('casual')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'casual'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Casual
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPitches.map(pitch => (
            <div
              key={pitch.id}
              className="p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
              onClick={() => onView(pitch)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{pitch.clientCompany}</h4>
                  <p className="text-sm text-muted-foreground">{pitch.clientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pitch.tone === 'formal' ? 'default' : 'secondary'}>
                    {pitch.tone}
                  </Badge>
                  <Badge variant="secondary">
                    Variant {pitch.variant}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {pitch.confidence}%
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-foreground line-clamp-2">
                  {pitch.elevatorPitch}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {pitch.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleCopy(pitch, e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleExport(pitch, e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(pitch);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(pitch.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(pitch.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
