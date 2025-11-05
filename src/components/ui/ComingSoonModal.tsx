import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  featureName,
}) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="text-center py-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {featureName} Coming Soon
        </h2>

        <p className="text-gray-600 mb-8 max-w-sm mx-auto">
          We're working hard to bring you this exciting feature. Stay tuned for updates!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => handleNavigate('/clients')}
          >
            Go to Clients
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Button
            onClick={() => handleNavigate('/dashboard')}
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
