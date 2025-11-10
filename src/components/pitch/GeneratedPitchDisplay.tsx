import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GeneratedPitch } from '../../types';
import { Copy, Download, Save, CheckCircle, Sparkles } from 'lucide-react';

interface GeneratedPitchDisplayProps {
  pitch: GeneratedPitch;
  onSave: (pitch: GeneratedPitch) => void;
}

export const GeneratedPitchDisplay: React.FC<GeneratedPitchDisplayProps> = ({
  pitch,
  onSave
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    // Support both new format and legacy format
    const isNewFormat = pitch.title && pitch.openingHook;
    
    let text = '';
    if (isNewFormat) {
      text = `
${pitch.title.toUpperCase()}

OPENING HOOK
${pitch.openingHook}

PROBLEM FRAMING
${pitch.problemFraming}

PROPOSED SOLUTION
${pitch.proposedSolution}

VALUE & OUTCOMES
${pitch.valueOutcomes.map((point, i) => `${i + 1}. ${point}`).join('\n')}

WHY US
${pitch.whyUs}

NEXT STEP CTA
${pitch.nextStepCTA}
      `.trim();
    } else {
      // Legacy format
      text = `
ELEVATOR PITCH
${pitch.elevatorPitch || ''}

VALUE POINTS
${(pitch.valuePoints || []).map((point, i) => `${i + 1}. ${point}`).join('\n')}

NEXT ACTIONS
${(pitch.nextActions || []).map((action, i) => `${i + 1}. ${action}`).join('\n')}
      `.trim();
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(pitch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportPDF = () => {
    const isNewFormat = pitch.title && pitch.openingHook;
    const clientCompany = pitch.clientCompany || 'Client';
    const clientName = pitch.clientName || 'Unknown';
    const services = pitch.services || [];
    
    let text = '';
    if (isNewFormat) {
      text = `
PITCH FOR ${clientCompany.toUpperCase()}
Generated: ${new Date(pitch.createdAt).toLocaleString()}

CLIENT: ${clientName}
COMPANY: ${clientCompany}
${services.length > 0 ? `SERVICES: ${services.join(', ')}` : ''}
TONE: ${pitch.tone.toUpperCase()}
LENGTH: ${pitch.length.toUpperCase()}

${pitch.title.toUpperCase()}

OPENING HOOK
${pitch.openingHook}

PROBLEM FRAMING
${pitch.problemFraming}

PROPOSED SOLUTION
${pitch.proposedSolution}

VALUE & OUTCOMES
${pitch.valueOutcomes.map((point, i) => `${i + 1}. ${point}`).join('\n')}

WHY US
${pitch.whyUs}

NEXT STEP CTA
${pitch.nextStepCTA}
      `.trim();
    } else {
      // Legacy format
      text = `
PITCH FOR ${clientCompany.toUpperCase()}
Generated: ${new Date(pitch.createdAt).toLocaleString()}

CLIENT: ${clientName}
COMPANY: ${clientCompany}
SERVICES: ${services.join(', ')}
TONE: ${pitch.tone.toUpperCase()}

ELEVATOR PITCH
${pitch.elevatorPitch || ''}

VALUE POINTS
${(pitch.valuePoints || []).map((point, i) => `${i + 1}. ${point}`).join('\n')}

SUGGESTED NEXT ACTIONS
${(pitch.nextActions || []).map((action, i) => `${i + 1}. ${action}`).join('\n')}

${pitch.confidence ? `CONFIDENCE SCORE: ${pitch.confidence}%` : ''}
${pitch.evidenceTags && pitch.evidenceTags.length > 0 ? `EVIDENCE TAGS: ${pitch.evidenceTags.join(', ')}` : ''}
${pitch.variant ? `VARIANT: ${pitch.variant}` : ''}
      `.trim();
    }

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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (confidence >= 60) return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  };

  const isNewFormat = pitch.title && pitch.openingHook;
  const clientName = pitch.clientName || 'Unknown';
  const clientCompany = pitch.clientCompany || 'Client';
  const services = pitch.services || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {isNewFormat ? pitch.title : `Generated Pitch${pitch.variant ? ` - Variant ${pitch.variant}` : ''}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                For {clientName} at {clientCompany}
              </p>
            </div>
            {pitch.confidence && (
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-full border-2 ${getConfidenceColor(pitch.confidence)}`}>
                  <p className="text-xs font-medium">Confidence</p>
                  <p className="text-xl font-bold">{pitch.confidence}%</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {services.length > 0 && services.map((service, index) => (
                <Badge key={index} variant="secondary">
                  {service}
                </Badge>
              ))}
              <Badge variant={pitch.tone === 'formal' ? 'default' : 'secondary'}>
                {pitch.tone}
              </Badge>
              <Badge variant={pitch.length === 'long' ? 'default' : 'secondary'}>
                {pitch.length}
              </Badge>
            </div>

            {isNewFormat ? (
              <>
                {/* New Format */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    Opening Hook
                  </h3>
                  <p className="text-base text-blue-900 leading-relaxed">
                    {pitch.openingHook}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    Problem Framing
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed p-4 bg-muted/50 rounded-lg border border-border">
                    {pitch.problemFraming}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    Proposed Solution
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed p-4 bg-blue-50 rounded-lg border border-blue-200">
                    {pitch.proposedSolution}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    Value & Outcomes
                  </h3>
                  <div className="space-y-3">
                    {pitch.valueOutcomes.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <p className="text-sm text-foreground pt-1">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    Why Us
                  </h3>
                  <p className="text-sm text-foreground leading-relaxed p-4 bg-green-50 rounded-lg border border-green-200">
                    {pitch.whyUs}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-lg">🚀</span>
                    Next Step
                  </h3>
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
                    <p className="text-base font-medium text-foreground">{pitch.nextStepCTA}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Legacy Format */}
                {pitch.elevatorPitch && (
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      Elevator Pitch
                    </h3>
                    <p className="text-base text-blue-900 leading-relaxed">
                      {pitch.elevatorPitch}
                    </p>
                  </div>
                )}

                {pitch.valuePoints && pitch.valuePoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      Value Points
                    </h3>
                    <div className="space-y-3">
                      {pitch.valuePoints.map((point, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <p className="text-sm text-foreground pt-1">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pitch.nextActions && pitch.nextActions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-lg">🚀</span>
                      Suggested Next Actions
                    </h3>
                    <div className="space-y-2">
                      {pitch.nextActions.map((action, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <span className="text-green-600 font-bold">→</span>
                          <p className="text-sm text-green-900">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pitch.evidenceTags && pitch.evidenceTags.length > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                      Evidence Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {pitch.evidenceTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Library
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
