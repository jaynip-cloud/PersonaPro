import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}


export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onComplete }) => {
  const [currentStep] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();


  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    linkedinUrl: ''
  });

  // Load persisted data from localStorage
  const loadPersistedData = () => {
    try {
      const persistedData = localStorage.getItem('onboarding_wizard_data');
      if (persistedData) {
        const parsedData = JSON.parse(persistedData);
        setFormData(prev => ({
          ...prev,
          ...parsedData
        }));
      }
    } catch (error) {
      console.error('Error loading persisted onboarding data:', error);
    }
  };

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isOpen && user) {
      try {
        localStorage.setItem('onboarding_wizard_data', JSON.stringify(formData));
      } catch (error) {
        console.error('Error saving onboarding data to localStorage:', error);
      }
    }
  }, [formData, isOpen, user]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('company_name, website, linkedin_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const dbData = {
          companyName: (profile as any).company_name || '',
          website: (profile as any).website || '',
          linkedinUrl: (profile as any).linkedin_url || ''
        };
        
        // Only override if database has data and localStorage doesn't
        const persistedData = localStorage.getItem('onboarding_wizard_data');
        if (!persistedData || !JSON.parse(persistedData).companyName) {
          setFormData(dbData);
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      // Load persisted data from localStorage first
      loadPersistedData();
      // Then check if there's database data to override with
      loadExistingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const totalSteps = 1;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
        return formData.companyName && formData.website && formData.linkedinUrl;
  };

  const handleNext = async () => {
    // Step 1 is the only step - navigate to Knowledge Base
    if (currentStep === 1 && canProceed()) {
      // Save basic info first
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .upsert({
              user_id: user.id,
              company_name: formData.companyName,
              website: formData.website,
              linkedin_url: formData.linkedinUrl,
              updated_at: new Date().toISOString()
            } as any, {
              onConflict: 'user_id'
            });
        } catch (error) {
          console.error('Error saving basic company info:', error);
        }
      }
      
      // Clear persisted onboarding data when proceeding
      localStorage.removeItem('onboarding_wizard_data');
      
      // Clear persisted onboarding data when proceeding
      localStorage.removeItem('onboarding_wizard_data');
      
      // Navigate to Knowledge Base with fetch flag
      onComplete();
      navigate('/knowledge-base?mode=view-details&fetch=true');
    }
  };


  return (
    <>
    <Modal isOpen={isOpen} onClose={() => {}} size="xl" closeOnEscape={false} closeOnClickOutside={false}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900">
            Complete your onboarding
          </h2>
          <p className="text-center text-slate-600 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mb-6">
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="min-h-[500px] max-h-[500px] overflow-y-auto pr-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Company Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="e.g., Google"
                  required
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL *
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.google.com/"
                  required
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn URL *
                </label>
                <Input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://www.linkedin.com/company/google"
                  required
                  className="pr-6"
                />
              </div>
            </div>
          )}

              </div>

        <div className="flex items-center justify-end mt-8 pt-6 border-t border-slate-200">
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
            Continue to Knowledge Base
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
        </div>
      </div>
    </Modal>
  </>
  );
};
