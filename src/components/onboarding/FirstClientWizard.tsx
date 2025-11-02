import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  Tag,
  Plus,
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface FirstClientWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const FirstClientWizard: React.FC<FirstClientWizardProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    contactName: '',
    company: '',
    website: '',
    primaryEmail: '',
    primaryPhone: '',
    jobTitle: '',
    industry: '',
    city: '',
    country: '',
    companySize: '',
    linkedinUrl: '',
    status: 'prospect' as 'active' | 'inactive' | 'prospect' | 'churned',
    tags: [] as string[],
    tagInput: '',
    companyOverview: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 3;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, formData.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
      if (!formData.company.trim()) newErrors.company = 'Company is required';
      if (!formData.primaryEmail.trim()) {
        newErrors.primaryEmail = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
        newErrors.primaryEmail = 'Invalid email format';
      }
      if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
      if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSave = async () => {
    if (!user || !validateStep()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          contact_name: formData.contactName,
          company: formData.company,
          website: formData.website,
          primary_email: formData.primaryEmail,
          email: formData.primaryEmail,
          primary_phone: formData.primaryPhone,
          phone: formData.primaryPhone,
          job_title: formData.jobTitle,
          industry: formData.industry,
          city: formData.city,
          country: formData.country,
          company_size: formData.companySize,
          linkedin_url: formData.linkedinUrl,
          status: formData.status,
          tags: formData.tags,
          company_overview: formData.companyOverview,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      onComplete();
      navigate('/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onSkip} size="large">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              Add Your First Client
            </h2>
            <button
              onClick={onSkip}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Skip for now
            </button>
          </div>
          <p className="text-slate-600">
            Let's get you started by adding your first client
          </p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                  />
                  {errors.contactName && (
                    <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="Acme Corporation"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                  {errors.company && (
                    <p className="text-xs text-red-600 mt-1">{errors.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="john@acme.com"
                    value={formData.primaryEmail}
                    onChange={(e) => handleChange('primaryEmail', e.target.value)}
                  />
                  {errors.primaryEmail && (
                    <p className="text-xs text-red-600 mt-1">{errors.primaryEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.primaryPhone}
                    onChange={(e) => handleChange('primaryPhone', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role / Title <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="VP of Engineering"
                    value={formData.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                  />
                  {errors.jobTitle && (
                    <p className="text-xs text-red-600 mt-1">{errors.jobTitle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Education">Education</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.industry && (
                    <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="https://company.com"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    City
                  </label>
                  <Input
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Country
                  </label>
                  <Input
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleChange('companySize', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    LinkedIn Profile
                  </label>
                  <Input
                    placeholder="https://linkedin.com/company/acme"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Additional Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g., decision-maker, technical)"
                    value={formData.tagInput}
                    onChange={(e) => handleChange('tagInput', e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button onClick={addTag} variant="outline" type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Overview
                </label>
                <textarea
                  placeholder="Brief overview of the company, their mission, and what they do..."
                  value={formData.companyOverview}
                  onChange={(e) => handleChange('companyOverview', e.target.value)}
                  className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-200">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <Button variant="primary" onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add Client
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
