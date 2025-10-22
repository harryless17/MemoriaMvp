'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { 
  Users, 
  Camera, 
  Brain, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Clock,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InviteMembersDialog } from './InviteMembersDialog';

interface EventWizardProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EventWizard({ eventId, eventTitle, isOpen, onClose }: EventWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Restore wizard state from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedState = localStorage.getItem(`wizard_${eventId}`);
      if (savedState) {
        try {
          const { step } = JSON.parse(savedState);
          if (step && step > 1 && step <= 4) {
            setCurrentStep(step);
          }
        } catch (error) {
          console.error('Error parsing wizard state:', error);
        }
      }
    }
  }, [isOpen, eventId]);

  const steps = [
    {
      number: 1,
      title: 'Inviter des participants',
      description: 'Ajoutez les personnes présentes à l\'événement',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      estimatedTime: '1 min',
      skippable: true,
    },
    {
      number: 2,
      title: 'Uploader les photos',
      description: 'Importez toutes les photos de l\'événement',
      icon: Camera,
      color: 'from-purple-500 to-pink-600',
      estimatedTime: '2-5 min',
      skippable: false,
    },
    {
      number: 3,
      title: 'Analyser les visages',
      description: 'L\'IA va détecter et regrouper les personnes',
      icon: Brain,
      color: 'from-emerald-500 to-teal-600',
      estimatedTime: '2-5 min',
      skippable: true,
    },
    {
      number: 4,
      title: 'Identifier les personnes',
      description: 'Associez les visages aux participants',
      icon: CheckCircle,
      color: 'from-orange-500 to-red-600',
      estimatedTime: '5-10 min',
      skippable: false,
    },
  ];

  const currentStepData = steps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  const handleNext = () => {
    const nextStep = currentStep + 1;
    
    if (isLastStep) {
      // Last step - go to people page and clear wizard state
      localStorage.removeItem(`wizard_${eventId}`);
      router.push(`/e/${eventId}/people`);
      onClose();
    } else {
      setCurrentStep(nextStep);
      // Save progress
      localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
        step: nextStep,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      // Save progress
      localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
        step: prevStep,
        timestamp: new Date().toISOString()
      }));
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleFinishLater = () => {
    // Save wizard state in localStorage
    localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
      step: currentStep,
      timestamp: new Date().toISOString()
    }));
    onClose();
    router.push(`/e/${eventId}`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl">
                
                {/* Close button */}
                <button
                  onClick={handleFinishLater}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Terminer plus tard"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="p-8 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-center mb-6">
                    <h2 className="text-3xl font-black mb-2">
                      Configuration de votre événement
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      {eventTitle}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      {steps.map((step) => (
                        <div
                          key={step.number}
                          className={cn(
                            'flex-1 h-2 rounded-full mx-1 transition-all',
                            step.number < currentStep
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                              : step.number === currentStep
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Étape {currentStep}/{steps.length}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  
                  {/* Step icon and title */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 mb-4">
                      <div className={cn(
                        'w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                        currentStepData.color
                      )}>
                        <currentStepData.icon className="w-9 h-9 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-black mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      {currentStepData.description}
                    </p>
                    {currentStepData.estimatedTime && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-full text-sm">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-blue-700 dark:text-blue-300">
                          Temps estimé : {currentStepData.estimatedTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="max-w-2xl mx-auto mb-8">
                    {currentStep === 1 && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          Invitez les participants pour qu'ils puissent recevoir leurs photos automatiquement.
                        </p>
                        <Button
                          size="lg"
                          onClick={() => setInviteDialogOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mb-4"
                        >
                          <Users className="w-5 h-5 mr-2" />
                          Ouvrir le gestionnaire de participants
                        </Button>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
                          💡 Vous pouvez aussi passer cette étape et inviter les participants plus tard
                        </p>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center">
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          Importez toutes les photos de votre événement. Plus vous en uploadez, meilleure sera la détection des visages.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <Camera className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-sm font-semibold mb-1">Photos</p>
                            <p className="text-xs text-slate-500">JPG, PNG, HEIC</p>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-semibold mb-1">Jusqu'à 50MB</p>
                            <p className="text-xs text-slate-500">Par fichier</p>
                          </div>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => {
                            // Save current step and open upload in new tab or redirect
                            localStorage.setItem(`wizard_${eventId}`, JSON.stringify({ 
                              step: 2,
                              timestamp: new Date().toISOString()
                            }));
                            router.push(`/upload?eventId=${eventId}&fromWizard=true`);
                          }}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Aller à la page d'upload
                        </Button>
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 Après avoir uploadé vos photos, revenez ici et cliquez sur <strong>Continuer</strong> pour passer à l'analyse
                          </p>
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center">
                        <div className="mb-6">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-white animate-pulse" />
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            L'analyse faciale détectera automatiquement les personnes sur vos photos.
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-500">
                            💡 <strong>Astuce :</strong> Plus vous avez de photos, meilleure sera la détection.
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={handleNext}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                          <Brain className="w-5 h-5 mr-2" />
                          Lancer l'analyse automatique
                        </Button>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h4 className="text-xl font-bold mb-2 text-green-900 dark:text-green-100">
                          🎉 Configuration terminée !
                        </h4>
                        <p className="text-green-700 dark:text-green-300 mb-6">
                          Votre événement est prêt. Vous allez maintenant pouvoir identifier qui est qui sur vos photos pour que chacun reçoive ses souvenirs automatiquement.
                        </p>
                        <div className="bg-white dark:bg-slate-900/50 rounded-xl p-4 mb-6">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            💡 <strong>Prochaine étape :</strong> L'analyse faciale vous permettra de regrouper automatiquement les visages similaires, puis vous pourrez les assigner aux participants.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer navigation */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={isFirstStep}
                      className="gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Précédent
                    </Button>

                    <div className="flex gap-3">
                      {currentStepData.skippable && !isLastStep && (
                        <Button
                          variant="outline"
                          onClick={handleSkip}
                        >
                          Passer
                        </Button>
                      )}
                      
                      <Button
                        onClick={handleFinishLater}
                        variant="ghost"
                        className="text-slate-600 dark:text-slate-400"
                      >
                        Terminer plus tard
                      </Button>

                      <Button
                        onClick={handleNext}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
                      >
                        {isLastStep ? 'Terminer' : 'Continuer'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Invite Members Dialog */}
      <InviteMembersDialog
        eventId={eventId}
        isOpen={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onMemberAdded={() => {
          setInviteDialogOpen(false);
          // Show success and suggest moving to next step
          if (currentStep === 1) {
            // Small delay to show the dialog closed
            setTimeout(() => {
              if (window.confirm('✅ Participant(s) ajouté(s) !\n\nVoulez-vous passer à l\'étape suivante (Upload des photos) ?')) {
                handleNext();
              }
            }, 300);
          }
        }}
        currentMemberIds={[]}
      />
    </>
  );
}

