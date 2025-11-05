import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Save, X } from 'lucide-react';

interface FormData {
  name: string;
  projectCode: string;
  clientId: string;
  projectType: string;
  summary: string;
  tags: string[];
  status: string;
  startDate: string;
  endDatePlanned: string;
  projectManager: string;
  teamMembers: string[];
  currency: string;
  valueAmount: string;
}

interface FormErrors {
  name?: string;
  clientId?: string;
  projectType?: string;
  status?: string;
  startDate?: string;
  endDatePlanned?: string;
}

const mockClients = [
  { id: '1', name: 'TechCorp Solutions' },
  { id: '2', name: 'Global Finance Partners' },
  { id: '3', name: 'Retail Dynamics' },
  { id: '4', name: 'Creative Studios Inc' },
  { id: '5', name: 'MarketPro Agency' },
];

const mockManagers = [
  'Sarah Chen',
  'John Smith',
  'Emma Wilson',
  'David Lee',
  'Michael Brown',
];

const mockTeamMembers = [
  'Sarah Chen',
  'John Smith',
  'Emma Wilson',
  'David Lee',
  'Michael Brown',
  'Lisa Anderson',
  'Tom Rodriguez',
  'Jane Kim',
];

const projectTypes = [
  'Web Development',
  'Mobile App',
  'Automation',
  'Branding',
  'Marketing',
  'CRM Setup',
  'Consulting',
  'Training',
  'Other',
];

export const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    projectCode: '',
    clientId: '',
    projectType: '',
    summary: '',
    tags: [],
    status: 'opportunity_identified',
    startDate: '',
    endDatePlanned: '',
    projectManager: '',
    teamMembers: [],
    currency: 'USD',
    valueAmount: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState('');

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTeamMemberToggle = (member: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(member)
        ? prev.teamMembers.filter((m) => m !== member)
        : [...prev.teamMembers, member],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    if (!formData.projectType) {
      newErrors.projectType = 'Project type is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDatePlanned && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDatePlanned);
      if (endDate < startDate) {
        newErrors.endDatePlanned = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const projectId = Math.random().toString(36).substr(2, 9);
    console.log('Creating project:', { id: projectId, ...formData });

    alert('Project created successfully!');
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Create New Project</h1>
          <p className="text-muted-foreground mt-2">
            Fill in the details to create a new project
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.name ? 'border-red-500' : 'border-border'
                  }`}
                  placeholder="Enter project name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Code
                </label>
                <input
                  type="text"
                  value={formData.projectCode}
                  onChange={(e) => handleInputChange('projectCode', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., WEB-001"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional unique identifier
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.clientId ? 'border-red-500' : 'border-border'
                  }`}
                >
                  <option value="">Select a client</option>
                  {mockClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-sm text-red-500 mt-1">{errors.clientId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.projectType}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.projectType ? 'border-red-500' : 'border-border'
                  }`}
                >
                  <option value="">Select project type</option>
                  {projectTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.projectType && (
                  <p className="text-sm text-red-500 mt-1">{errors.projectType}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Summary
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Brief description of the project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.status ? 'border-red-500' : 'border-border'
                  }`}
                >
                  <option value="opportunity_identified">Opportunity Identified</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {errors.status && (
                  <p className="text-sm text-red-500 mt-1">{errors.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.startDate ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Date (Planned)
                </label>
                <input
                  type="date"
                  value={formData.endDatePlanned}
                  onChange={(e) => handleInputChange('endDatePlanned', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.endDatePlanned ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.endDatePlanned && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDatePlanned}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Project Manager
              </label>
              <select
                value={formData.projectManager}
                onChange={(e) => handleInputChange('projectManager', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a manager</option>
                {mockManagers.map((manager) => (
                  <option key={manager} value={manager}>
                    {manager}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Team Members
              </label>
              <div className="border border-border rounded-md p-3 bg-background max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {mockTeamMembers.map((member) => (
                    <label key={member} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.teamMembers.includes(member)}
                        onChange={() => handleTeamMemberToggle(member)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">{member}</span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.teamMembers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.teamMembers.length} member(s) selected
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercials (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Value Amount
                </label>
                <input
                  type="number"
                  value={formData.valueAmount}
                  onChange={(e) => handleInputChange('valueAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="gap-2">
            <Save className="h-4 w-4" />
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
};
