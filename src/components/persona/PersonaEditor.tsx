import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { X } from 'lucide-react';
import { PersonaMetrics } from '../../types';

interface PersonaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: PersonaMetrics;
  onSave: (updatedMetrics: PersonaMetrics) => void;
}

export const PersonaEditor: React.FC<PersonaEditorProps> = ({
  isOpen,
  onClose,
  metrics,
  onSave
}) => {
  const [editedMetrics, setEditedMetrics] = useState<PersonaMetrics>(metrics);
  const [newProjectType, setNewProjectType] = useState('');

  const handleSave = () => {
    onSave(editedMetrics);
    onClose();
  };

  const addProjectType = () => {
    if (newProjectType.trim() && !editedMetrics.topProjectTypes.includes(newProjectType.trim())) {
      setEditedMetrics({
        ...editedMetrics,
        topProjectTypes: [...editedMetrics.topProjectTypes, newProjectType.trim()]
      });
      setNewProjectType('');
    }
  };

  const removeProjectType = (type: string) => {
    setEditedMetrics({
      ...editedMetrics,
      topProjectTypes: editedMetrics.topProjectTypes.filter(t => t !== type)
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Persona Metrics">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Sentiment Score (-1 to +1)
          </label>
          <Input
            type="number"
            min="-1"
            max="1"
            step="0.1"
            value={editedMetrics.sentiment}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              sentiment: Math.max(-1, Math.min(1, parseFloat(e.target.value) || 0))
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Cooperation Level
          </label>
          <select
            value={editedMetrics.cooperation}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              cooperation: e.target.value as 'high' | 'medium' | 'low'
            })}
            className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Risk Level
          </label>
          <select
            value={editedMetrics.riskLevel}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              riskLevel: e.target.value as 'low' | 'medium' | 'high' | 'critical'
            })}
            className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Communication Style
          </label>
          <Input
            value={editedMetrics.communicationStyle.value}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              communicationStyle: {
                ...editedMetrics.communicationStyle,
                value: e.target.value
              }
            })}
            placeholder="e.g., Direct, Collaborative, Formal"
          />
          <select
            value={editedMetrics.communicationStyle.confidence}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              communicationStyle: {
                ...editedMetrics.communicationStyle,
                confidence: e.target.value as 'high' | 'medium' | 'low'
              }
            })}
            className="w-full mt-2 border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Response Speed (days)
          </label>
          <Input
            type="number"
            min="0"
            value={editedMetrics.responseSpeed.avgDays}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              responseSpeed: {
                ...editedMetrics.responseSpeed,
                avgDays: parseInt(e.target.value) || 0
              }
            })}
          />
          <select
            value={editedMetrics.responseSpeed.confidence}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              responseSpeed: {
                ...editedMetrics.responseSpeed,
                confidence: e.target.value as 'high' | 'medium' | 'low'
              }
            })}
            className="w-full mt-2 border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Negotiation Tone
          </label>
          <Input
            value={editedMetrics.negotiationTone.value}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              negotiationTone: {
                ...editedMetrics.negotiationTone,
                value: e.target.value
              }
            })}
            placeholder="e.g., Assertive, Flexible, Cautious"
          />
          <select
            value={editedMetrics.negotiationTone.confidence}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              negotiationTone: {
                ...editedMetrics.negotiationTone,
                confidence: e.target.value as 'high' | 'medium' | 'low'
              }
            })}
            className="w-full mt-2 border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Engagement Pattern
          </label>
          <Input
            value={editedMetrics.engagementPattern.value}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              engagementPattern: {
                ...editedMetrics.engagementPattern,
                value: e.target.value
              }
            })}
            placeholder="e.g., Proactive, Reactive, Sporadic"
          />
          <select
            value={editedMetrics.engagementPattern.confidence}
            onChange={(e) => setEditedMetrics({
              ...editedMetrics,
              engagementPattern: {
                ...editedMetrics.engagementPattern,
                confidence: e.target.value as 'high' | 'medium' | 'low'
              }
            })}
            className="w-full mt-2 border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Top Project Types
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newProjectType}
              onChange={(e) => setNewProjectType(e.target.value)}
              placeholder="Add project type"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addProjectType();
                }
              }}
            />
            <Button onClick={addProjectType} variant="outline">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editedMetrics.topProjectTypes.map((type, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {type}
                <button
                  onClick={() => removeProjectType(type)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
};
