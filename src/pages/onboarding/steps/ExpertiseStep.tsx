import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Plus, X, FileText } from 'lucide-react';

interface ExpertiseStepProps {
  data: any;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  saving: boolean;
}

interface CaseStudy {
  id: string;
  title: string;
  client: string;
  description: string;
  results: string;
}

export const ExpertiseStep: React.FC<ExpertiseStepProps> = ({ data, onNext, onBack, saving }) => {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>(data?.case_studies || []);
  const [showForm, setShowForm] = useState(false);
  const [currentCase, setCurrentCase] = useState<Partial<CaseStudy>>({
    title: '',
    client: '',
    description: '',
    results: '',
  });

  const handleAddCaseStudy = () => {
    if (currentCase.title && currentCase.description) {
      const newCase: CaseStudy = {
        id: Date.now().toString(),
        title: currentCase.title,
        client: currentCase.client || '',
        description: currentCase.description,
        results: currentCase.results || '',
      };

      setCaseStudies([...caseStudies, newCase]);
      setCurrentCase({ title: '', client: '', description: '', results: '' });
      setShowForm(false);
    }
  };

  const handleRemoveCaseStudy = (id: string) => {
    setCaseStudies(caseStudies.filter((cs) => cs.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onNext({ case_studies: caseStudies });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Share Your Expertise</h2>
        <p className="text-muted-foreground">
          Add case studies or examples of your work. This helps demonstrate your value to potential clients.
        </p>
      </div>

      {!showForm && (
        <Button
          type="button"
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Case Study
        </Button>
      )}

      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-border space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={currentCase.title}
              onChange={(e) => setCurrentCase({ ...currentCase, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Digital Transformation for Retail Chain"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Client Name
            </label>
            <input
              type="text"
              value={currentCase.client}
              onChange={(e) => setCurrentCase({ ...currentCase, client: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Major Retail Corp (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={currentCase.description}
              onChange={(e) => setCurrentCase({ ...currentCase, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
              placeholder="Describe the challenge, your approach, and the solution..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Results & Impact
            </label>
            <textarea
              value={currentCase.results}
              onChange={(e) => setCurrentCase({ ...currentCase, results: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
              placeholder="e.g., 40% increase in sales, reduced costs by $1M..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAddCaseStudy}
              variant="primary"
              disabled={!currentCase.title || !currentCase.description}
            >
              Add Case Study
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                setCurrentCase({ title: '', client: '', description: '', results: '' });
              }}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {caseStudies.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Your Case Studies ({caseStudies.length})
          </label>
          {caseStudies.map((caseStudy) => (
            <div
              key={caseStudy.id}
              className="bg-white border border-border rounded-lg p-4 relative"
            >
              <button
                type="button"
                onClick={() => handleRemoveCaseStudy(caseStudy.id)}
                className="absolute top-3 right-3 text-red-500 hover:bg-red-50 rounded-full p-1"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{caseStudy.title}</h4>
                  {caseStudy.client && (
                    <p className="text-sm text-muted-foreground">Client: {caseStudy.client}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {caseStudy.description}
                  </p>
                  {caseStudy.results && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      Results: {caseStudy.results}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {caseStudies.length === 0 && !showForm && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-border">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No case studies added yet</p>
          <p className="text-sm text-muted-foreground">Click "Add Case Study" to get started</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" onClick={onBack} variant="outline">
          Back
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
};
