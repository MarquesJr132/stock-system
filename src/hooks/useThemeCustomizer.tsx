import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  fontScale: number;
  compactMode: boolean;
  animations: boolean;
  customCss?: string;
}

const defaultTheme: ThemeConfig = {
  mode: 'light',
  primaryColor: 'hsl(221.2 83.2% 53.3%)', // default blue
  accentColor: 'hsl(210 40% 98%)',
  borderRadius: 8,
  fontScale: 100,
  compactMode: false,
  animations: true
};

const presetThemes = {
  default: {
    name: 'Padrão',
    primaryColor: 'hsl(221.2 83.2% 53.3%)',
    accentColor: 'hsl(210 40% 98%)'
  },
  emerald: {
    name: 'Esmeralda',
    primaryColor: 'hsl(142.1 76.2% 36.3%)',
    accentColor: 'hsl(151 81% 96%)'
  },
  violet: {
    name: 'Violeta',
    primaryColor: 'hsl(262.1 83.3% 57.8%)',
    accentColor: 'hsl(270 100% 98%)'
  },
  orange: {
    name: 'Laranja',
    primaryColor: 'hsl(24.6 95% 53.1%)',
    accentColor: 'hsl(33 100% 96%)'
  },
  red: {
    name: 'Vermelho',
    primaryColor: 'hsl(0 84.2% 60.2%)',
    accentColor: 'hsl(0 85.7% 97.3%)'
  },
  slate: {
    name: 'Ardósia',
    primaryColor: 'hsl(215.4 16.3% 46.9%)',
    accentColor: 'hsl(210 40% 98%)'
  }
};

export const useThemeCustomizer = () => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeConfig');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setTheme({ ...defaultTheme, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved theme:', error);
      }
    }
  }, []);

  // Apply theme to CSS variables
  const applyTheme = async (newTheme: ThemeConfig) => {
    setIsApplying(true);
    
    try {
      const root = document.documentElement;
      
      // Parse HSL values
      const primaryHsl = newTheme.primaryColor.match(/hsl\(([^)]+)\)/)?.[1] || '221.2 83.2% 53.3%';
      const accentHsl = newTheme.accentColor.match(/hsl\(([^)]+)\)/)?.[1] || '210 40% 98%';
      
      // Apply primary color variations
      root.style.setProperty('--primary', primaryHsl);
      
      // Generate primary foreground (white or black based on lightness)
      const [h, s, l] = primaryHsl.split(' ').map(v => parseFloat(v.replace('%', '')));
      const primaryForeground = l > 50 ? '0 0% 98%' : '0 0% 98%';
      root.style.setProperty('--primary-foreground', primaryForeground);
      
      // Apply accent color
      root.style.setProperty('--accent', accentHsl);
      root.style.setProperty('--accent-foreground', '0 0% 9%');
      
      // Apply border radius
      root.style.setProperty('--radius', `${newTheme.borderRadius}px`);
      
      // Apply font scale
      const baseSize = 16 * (newTheme.fontScale / 100);
      root.style.setProperty('font-size', `${baseSize}px`);
      
      // Apply compact mode
      if (newTheme.compactMode) {
        root.classList.add('compact-mode');
      } else {
        root.classList.remove('compact-mode');
      }
      
      // Apply animations
      if (!newTheme.animations) {
        root.classList.add('no-animations');
      } else {
        root.classList.remove('no-animations');
      }
      
      // Apply custom CSS
      let customStyleElement = document.getElementById('custom-theme-styles');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-theme-styles';
        document.head.appendChild(customStyleElement);
      }
      
      customStyleElement.textContent = `
        ${newTheme.customCss || ''}
        
        .compact-mode {
          --spacing-unit: 0.75rem;
        }
        
        .compact-mode .p-4 { padding: calc(var(--spacing-unit) * 0.75); }
        .compact-mode .p-6 { padding: var(--spacing-unit); }
        .compact-mode .py-2 { padding-top: calc(var(--spacing-unit) * 0.25); padding-bottom: calc(var(--spacing-unit) * 0.25); }
        .compact-mode .py-4 { padding-top: calc(var(--spacing-unit) * 0.5); padding-bottom: calc(var(--spacing-unit) * 0.5); }
        
        .no-animations * {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `;
      
      // Save theme
      localStorage.setItem('themeConfig', JSON.stringify(newTheme));
      setTheme(newTheme);
      
      toast({
        title: "Tema aplicado",
        description: "As personalizações foram aplicadas com sucesso"
      });
      
    } catch (error) {
      console.error('Failed to apply theme:', error);
      toast({
        title: "Erro ao aplicar tema",
        description: "Falha ao aplicar as personalizações",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Apply preset theme
  const applyPreset = (presetKey: keyof typeof presetThemes) => {
    const preset = presetThemes[presetKey];
    const newTheme = {
      ...theme,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor
    };
    applyTheme(newTheme);
  };

  // Reset to default theme
  const resetTheme = () => {
    applyTheme(defaultTheme);
  };

  // Export theme configuration
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Tema exportado",
      description: "Configuração do tema foi exportada com sucesso"
    });
  };

  // Import theme configuration
  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const newTheme = { ...defaultTheme, ...imported };
        applyTheme(newTheme);
      } catch (error) {
        toast({
          title: "Erro na importação",
          description: "Arquivo de tema inválido",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  return {
    theme,
    presetThemes,
    isApplying,
    applyTheme,
    applyPreset,
    resetTheme,
    exportTheme,
    importTheme
  };
};