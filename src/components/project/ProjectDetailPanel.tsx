import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { X, Save, Sparkles, Calendar, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'opportunity_identified' | 'discussion' | 'quote' | 'win' | 'loss';
  budget?: number;
  timeline?: string;
  dueDate?: string;
  clientName: string;
  createdAt: string;
}

interface ProjectDetailPanelProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
}

export const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({
  project,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const [editedProject, setEditedProject] = useState<Project>(project);

  useEffect(() => {
    setEditedProject(project);
  }, [project]);

  const handleSave = () => {
    onUpdate(editedProject);
  };

  const handleGeneratePitch = () => {
    navigate('/pitch-generator', { state: { project: editedProject } });
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'secondary';
      case 'discussion':
        return 'primary';
      case 'quote':
        return 'warning';
      case 'win':
        return 'success';
      case 'loss':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'Opportunity Identified';
      case 'discussion':
        return 'Discussion';
      case 'quote':
        return 'Quote';
      case 'win':
        return 'Win';
      case 'loss':
        return 'Loss';
      default:
        return status;
    }
  };

  const getProgressPercentage = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 20;
      case 'discussion':
        return 40;
      case 'quote':
        return 60;
      case 'win':
        return 100;
      case 'loss':
        return 0;
      default:
        return 0;
    }
  };

  const getProgressColor = (status: Project['status']) => {
    if (status === 'loss') return 'bg-red-500';
    if (status === 'win') return 'bg-green-500';
    return 'bg-blue-500';
  };

  if (!isOpen) return null;

  const progress = getProgressPercentage(editedProject.status);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Project Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Progress</label>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(editedProject.status)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress}% Complete
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={editedProject.title}
              onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={editedProject.description}
              onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client</label>
            <p className="text-foreground">{project.clientName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={editedProject.status}
              onChange={(e) => setEditedProject({ ...editedProject, status: e.target.value as Project['status'] })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="opportunity_identified">Opportunity Identified</option>
              <option value="discussion">Discussion</option>
              <option value="quote">Quote</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </label>
              <Input
                type="number"
                value={editedProject.budget || ''}
                onChange={(e) => setEditedProject({ ...editedProject, budget: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </label>
              <Input
                value={editedProject.timeline || ''}
                onChange={(e) => setEditedProject({ ...editedProject, timeline: e.target.value })}
                placeholder="e.g., 3 months"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            <Input
              type="date"
              value={editedProject.dueDate || ''}
              onChange={(e) => setEditedProject({ ...editedProject, dueDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="primary" className="flex-1" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleGeneratePitch}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Pitch
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </>
  );
};
