import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Connector } from '../../types';
import { CheckCircle, Shield, Lock } from 'lucide-react';

interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onAuthorize: () => void;
}

type Step = 'selection' | 'consent' | 'syncing' | 'success';

export const OAuthModal: React.FC<OAuthModalProps> = ({
  isOpen,
  onClose,
  connector,
  onAuthorize
}) => {
  const [step, setStep] = useState<Step>('selection');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('selection');
      setProgress(0);
    }
  }, [isOpen]);

  const handleProceedToConsent = () => {
    setStep('consent');
  };

  const handleAuthorize = () => {
    setStep('syncing');
    setProgress(0);

    const messages = [
      'Establishing connection...',
      'Authenticating...',
      'Fetching metadata...',
      'Mapping fields...',
      'Syncing data...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < messages.length) {
        setProgressMessage(messages[currentStep]);
        setProgress((currentStep / messages.length) * 100);
      } else {
        clearInterval(interval);
        setProgress(100);
        setProgressMessage('Complete!');
        setTimeout(() => {
          setStep('success');
          setTimeout(() => {
            onAuthorize();
            onClose();
          }, 1000);
        }, 500);
      }
    }, 800);

    setProgressMessage(messages[0]);
  };

  if (!connector) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'success' ? 'Connection Successful!' : `Connect ${connector.name}`}
      size="md"
    >
      {step === 'selection' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
              <img
                src={connector.logo}
                alt={`${connector.name} logo`}
                className="w-14 h-14 object-contain"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{connector.name}</h3>
              <p className="text-sm text-muted-foreground">{connector.description}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">This connector will access:</h4>
            <div className="space-y-2">
              {connector.scopes.map((scope, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-chart-2" />
                  <span>{scope}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Prototype Note:</strong> This is a simulated flow. No real credentials are stored or used.
                All data is mocked for demonstration purposes.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProceedToConsent}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'consent' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-6">
            <div className="w-24 h-24 flex items-center justify-center">
              <img
                src={connector.logo}
                alt={`${connector.name} logo`}
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Authorize PersonaPro?</h3>
            <p className="text-sm text-muted-foreground">
              PersonaPro would like to access your {connector.name} data
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Permissions requested:</span>
            </div>
            <ul className="space-y-1 ml-6 text-sm text-muted-foreground">
              {connector.scopes.map((scope, index) => (
                <li key={index}>• {scope}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-xs text-amber-900 dark:text-amber-100">
              This is a simulated OAuth consent screen. In production, this would redirect to {connector.name}'s
              actual authorization page.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAuthorize}>
              Authorize
            </Button>
          </div>
        </div>
      )}

      {step === 'syncing' && (
        <div className="space-y-6 py-6">
          <div className="flex items-center justify-center">
            <div className="w-20 h-20 flex items-center justify-center animate-pulse">
              <img
                src={connector.logo}
                alt={`${connector.name} logo`}
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">{progressMessage}</p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Please wait while we establish the connection...
          </p>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4 py-6">
          <div className="flex items-center justify-center">
            <CheckCircle className="h-16 w-16 text-chart-2" />
          </div>
          <p className="text-center text-foreground font-medium">
            Successfully connected to {connector.name}!
          </p>
          <p className="text-sm text-center text-muted-foreground">
            Data synchronization will begin shortly.
          </p>
        </div>
      )}
    </Modal>
  );
};
