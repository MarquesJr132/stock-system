import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MicroInteractionConfig {
  enableHoverEffects: boolean;
  enableClickFeedback: boolean;
  enableLoadingStates: boolean;
  enableSuccessAnimations: boolean;
  enableErrorAnimations: boolean;
  animationDuration: number;
}

const defaultConfig: MicroInteractionConfig = {
  enableHoverEffects: true,
  enableClickFeedback: true,
  enableLoadingStates: true,
  enableSuccessAnimations: true,
  enableErrorAnimations: true,
  animationDuration: 300
};

export const useMicroInteractions = () => {
  const [config, setConfig] = useState<MicroInteractionConfig>(defaultConfig);
  const [activeInteractions, setActiveInteractions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('microInteractionsConfig');
    if (saved) {
      try {
        setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      } catch (error) {
        console.error('Failed to load micro-interactions config:', error);
      }
    }
  }, []);

  // Save config to localStorage
  const updateConfig = useCallback((newConfig: Partial<MicroInteractionConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem('microInteractionsConfig', JSON.stringify(updated));
  }, [config]);

  // Generic interaction tracker
  const trackInteraction = useCallback((id: string, duration = config.animationDuration) => {
    setActiveInteractions(prev => new Set(prev).add(id));
    
    setTimeout(() => {
      setActiveInteractions(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, duration);
  }, [config.animationDuration]);

  // Hover effect hook
  const useHoverEffect = (id: string) => {
    const [isHovered, setIsHovered] = useState(false);

    return {
      isHovered: config.enableHoverEffects ? isHovered : false,
      props: config.enableHoverEffects ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
        className: isHovered ? 'hover-lifted' : ''
      } : {}
    };
  };

  // Click feedback
  const useClickFeedback = (id: string) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = useCallback((callback?: () => void) => {
      if (!config.enableClickFeedback) {
        callback?.();
        return;
      }

      setIsClicked(true);
      trackInteraction(`click-${id}`);
      
      setTimeout(() => {
        setIsClicked(false);
        callback?.();
      }, 150);
    }, [id, trackInteraction, config.enableClickFeedback]);

    return {
      isClicked: config.enableClickFeedback ? isClicked : false,
      handleClick,
      className: isClicked ? 'click-feedback' : ''
    };
  };

  // Loading state
  const useLoadingState = (id: string) => {
    const [isLoading, setIsLoading] = useState(false);

    const withLoading = useCallback(async <T,>(
      asyncFn: () => Promise<T>,
      options?: {
        minDuration?: number;
        successMessage?: string;
        errorMessage?: string;
      }
    ): Promise<T | null> => {
      if (!config.enableLoadingStates) {
        try {
          return await asyncFn();
        } catch (error) {
          if (options?.errorMessage) {
            toast({
              title: "Erro",
              description: options.errorMessage,
              variant: "destructive"
            });
          }
          return null;
        }
      }

      setIsLoading(true);
      trackInteraction(`loading-${id}`, options?.minDuration || 1000);

      const startTime = Date.now();
      
      try {
        const result = await asyncFn();
        
        // Ensure minimum loading duration for better UX
        const elapsed = Date.now() - startTime;
        const minDuration = options?.minDuration || 500;
        
        if (elapsed < minDuration) {
          await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
        }

        if (config.enableSuccessAnimations && options?.successMessage) {
          toast({
            title: "Sucesso",
            description: options.successMessage,
            className: "success-toast"
          });
        }

        return result;
      } catch (error) {
        if (config.enableErrorAnimations && options?.errorMessage) {
          toast({
            title: "Erro",
            description: options.errorMessage,
            variant: "destructive",
            className: "error-toast shake"
          });
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [id, trackInteraction, config, toast]);

    return {
      isLoading: config.enableLoadingStates ? isLoading : false,
      withLoading
    };
  };

  // Success animation
  const triggerSuccess = useCallback((message?: string) => {
    if (!config.enableSuccessAnimations) return;

    const id = `success-${Date.now()}`;
    trackInteraction(id, 2000);

    if (message) {
      toast({
        title: "Sucesso",
        description: message,
        className: "success-toast pulse-success"
      });
    }

    // Add success particle effect
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'success-particle';
      particle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: hsl(var(--primary));
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        animation: successParticle 1s ease-out forwards;
        left: 50%;
        top: 50%;
      `;
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        particle.remove();
      }, 1000);
    };

    // Create multiple particles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => createParticle(), i * 100);
    }
  }, [config.enableSuccessAnimations, trackInteraction, toast]);

  // Error animation
  const triggerError = useCallback((message?: string) => {
    if (!config.enableErrorAnimations) return;

    const id = `error-${Date.now()}`;
    trackInteraction(id, 1000);

    if (message) {
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
        className: "error-toast shake"
      });
    }

    // Add screen shake effect
    document.body.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      document.body.style.animation = '';
    }, 500);
  }, [config.enableErrorAnimations, trackInteraction, toast]);

  // Confirmation dialog with micro-interactions
  const useConfirmation = () => {
    const confirm = useCallback((
      title: string,
      description: string,
      onConfirm: () => void,
      onCancel?: () => void
    ) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in';
      
      dialog.innerHTML = `
        <div class="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 animate-scale-in">
          <h3 class="text-lg font-semibold mb-2">${title}</h3>
          <p class="text-muted-foreground mb-6">${description}</p>
          <div class="flex gap-2 justify-end">
            <button class="px-4 py-2 text-sm bg-muted rounded hover:bg-muted/80 transition-colors" data-action="cancel">
              Cancelar
            </button>
            <button class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors" data-action="confirm">
              Confirmar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      dialog.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.dataset.action === 'confirm') {
          onConfirm();
          dialog.remove();
        } else if (target.dataset.action === 'cancel' || target === dialog) {
          onCancel?.();
          dialog.remove();
        }
      });

      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.remove();
          onCancel?.();
        }
      }, 10000);
    }, []);

    return { confirm };
  };

  return {
    config,
    updateConfig,
    activeInteractions,
    useHoverEffect,
    useClickFeedback,
    useLoadingState,
    useConfirmation,
    triggerSuccess,
    triggerError,
    trackInteraction
  };
};