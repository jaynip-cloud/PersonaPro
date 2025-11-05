import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { X, Edit2, Save, Sparkles, Calendar, DollarSign, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'opportunity_identified' | 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>(project);

  const handleSave = () => {
    onUpdate(editedProject);
    setIsEditing(false);
  };

  const handleGeneratePitch = () => {
    navigate('/pitch-generator', { state: { project: editedProject } });
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'secondary';
      case 'planned':
        return 'primary';
      case 'in_progress':
        return 'warning';
      case 'on_hold':
        return 'error';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'Opportunity Identified';
      case 'planned':
        return 'Planned';
      case 'in_progress':
        return 'In Progress';
      case 'on_hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

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
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            {isEditing ? (
              <Input
                value={editedProject.title}
                onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
              />
            ) : (
              <p className="text-lg font-semibold">{project.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={editedProject.description}
                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            ) : (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client</label>
            <p className="text-foreground">{project.clientName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            {isEditing ? (
              <select
                value={editedProject.status}
                onChange={(e) => setEditedProject({ ...editedProject, status: e.target.value as Project['status'] })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="opportunity_identified">Opportunity Identified</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            ) : (
              <Badge variant={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedProject.budget || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, budget: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              ) : (
                <p className="text-foreground">
                  {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </label>
              {isEditing ? (
                <Input
                  value={editedProject.timeline || ''}
                  onChange={(e) => setEditedProject({ ...editedProject, timeline: e.target.value })}
                  placeholder="e.g., 3 months"
                />
              ) : (
                <p className="text-foreground">{project.timeline || 'Not set'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            {isEditing ? (
              <Input
                type="date"
                value={editedProject.dueDate || ''}
                onChange={(e) => setEditedProject({ ...editedProject, dueDate: e.target.value })}
              />
            ) : (
              <p className="text-foreground">
                {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <Button variant="primary" className="w-full" onClick={handleGeneratePitch}>
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
