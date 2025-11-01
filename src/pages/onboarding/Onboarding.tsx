import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../lib/auth';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { CheckCircle, Building2, Briefcase, FileText, Rocket } from 'lucide-react';
import { CompanyInfoStep } from './steps/CompanyInfoStep';
import { ServicesStep } from './steps/ServicesStep';
import { ExpertiseStep } from './steps/ExpertiseStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = [
  { id: 1, title: 'Company Info', icon: Building2, description: 'Tell us about your company' },
  { id: 2, title: 'Services', icon: Briefcase, description: 'What services do you offer?' },
  { id: 3, title: 'Expertise', icon: FileText, description: 'Share your expertise and case studies' },
  { id: 4, title: 'Review', icon: Rocket, description: 'Review and complete setup' },
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization, refreshOrganization } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    step1: {},
    step2: {},
    step3: {},
  });

  useEffect(() => {
    const loadOnboardingState = async () => {
      if (!user || !organization) return;

      try {
        const state = await authService.getOnboardingState(user.id, organization.id);
        if (state) {
          setCurrentStep(state.current_step || 1);
          setFormData({
            step1: state.step_1_data || {},
            step2: state.step_2_data || {},
            step3: state.step_3_data || {},
          });
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOnboardingState();
  }, [user, organization]);

  const saveProgress = async (step: number, data: any) => {
    if (!user || !organization) return;

    setSaving(true);
    try {
      await authService.updateOnboardingState(user.id, organization.id, {
        [`step_${step}_data`]: data,
        [`step_${step}_completed`]: true,
        current_step: step + 1,
      });

      setFormData((prev) => ({
        ...prev,
        [`step${step}`]: data,
      }));
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async (stepData: any) => {
    await saveProgress(currentStep, stepData);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      const finalData = {
        name: formData.step1.name || organization.name,
        about: formData.step1.about,
        industry: formData.step1.industry,
        company_size: formData.step1.company_size,
        website: formData.step1.website,
        services: formData.step2.services,
        case_studies: formData.step3.case_studies,
      };

      await authService.completeOnboarding(organization.id, finalData);
      await refreshOrganization();
      navigate('/welcome');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Your Client Intelligence Platform</h1>
          <p className="text-muted-foreground">Let's set up your company knowledge base in 4 simple steps</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isActive
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-6 w-6" />
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 transition-colors ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <CompanyInfoStep
                data={formData.step1}
                onNext={handleNext}
                saving={saving}
              />
            )}
            {currentStep === 2 && (
              <ServicesStep
                data={formData.step2}
                onNext={handleNext}
                onBack={handleBack}
                saving={saving}
              />
            )}
            {currentStep === 3 && (
              <ExpertiseStep
                data={formData.step3}
                onNext={handleNext}
                onBack={handleBack}
                saving={saving}
              />
            )}
            {currentStep === 4 && (
              <ReviewStep
                data={formData}
                onBack={handleBack}
                onComplete={handleComplete}
                saving={saving}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Step {currentStep} of {STEPS.length}</p>
        </div>
      </div>
    </div>
  );
};
