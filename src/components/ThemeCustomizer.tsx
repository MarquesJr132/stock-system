import { useState } from 'react';
import { Palette, Download, Upload, RotateCcw, Settings, Monitor, Sun, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useThemeCustomizer } from '@/hooks/useThemeCustomizer';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export const ThemeCustomizer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState('#3b82f6');
  const { theme, presetThemes, isApplying, applyTheme, applyPreset, resetTheme, exportTheme, importTheme } = useThemeCustomizer();
  const { setTheme: setNextTheme, theme: currentTheme } = useTheme();

  const handleColorChange = (color: string) => {
    // Convert hex to HSL
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const hslColor = `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
    
    applyTheme({
      ...theme,
      primaryColor: hslColor
    });
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importTheme(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          Personalizar Tema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personalização de Tema
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Modo de Tema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={currentTheme === 'light' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-2 h-16"
                    onClick={() => setNextTheme('light')}
                  >
                    <Sun className="h-6 w-6" />
                    <span>Claro</span>
                  </Button>
                  <Button
                    variant={currentTheme === 'dark' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-2 h-16"
                    onClick={() => setNextTheme('dark')}
                  >
                    <Moon className="h-6 w-6" />
                    <span>Escuro</span>
                  </Button>
                  <Button
                    variant={currentTheme === 'system' ? 'default' : 'outline'}
                    className="flex flex-col items-center gap-2 h-16"
                    onClick={() => setNextTheme('system')}
                  >
                    <Monitor className="h-6 w-6" />
                    <span>Sistema</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Temas Predefinidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(presetThemes).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-20 p-4"
                      onClick={() => applyPreset(key as keyof typeof presetThemes)}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-border"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cor Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="custom-color">Cor Personalizada</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="custom-color"
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        handleColorChange(e.target.value);
                      }}
                      className="w-20 h-10"
                    />
                    <Input
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        handleColorChange(e.target.value);
                      }}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Visualização</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Button className="w-full">Botão Principal</Button>
                      <Button variant="outline" className="w-full">Botão Secundário</Button>
                    </div>
                    <div className="space-y-2">
                      <Badge>Badge Principal</Badge>
                      <Badge variant="secondary">Badge Secundário</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Raio das Bordas: {theme.borderRadius}px</Label>
                  <Slider
                    value={[theme.borderRadius]}
                    onValueChange={([value]) => 
                      applyTheme({ ...theme, borderRadius: value })
                    }
                    max={20}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Escala da Fonte: {theme.fontScale}%</Label>
                  <Slider
                    value={[theme.fontScale]}
                    onValueChange={([value]) => 
                      applyTheme({ ...theme, fontScale: value })
                    }
                    max={150}
                    min={75}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Modo Compacto</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduz espaçamentos para maximizar conteúdo
                    </p>
                  </div>
                  <Switch
                    checked={theme.compactMode}
                    onCheckedChange={(checked) => 
                      applyTheme({ ...theme, compactMode: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Animações</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilita transições e animações suaves
                    </p>
                  </div>
                  <Switch
                    checked={theme.animations}
                    onCheckedChange={(checked) => 
                      applyTheme({ ...theme, animations: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CSS Personalizado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="custom-css">CSS Adicional</Label>
                    <Textarea
                      id="custom-css"
                      value={theme.customCss || ''}
                      onChange={(e) => 
                        applyTheme({ ...theme, customCss: e.target.value })
                      }
                      placeholder="/* Adicione seu CSS personalizado aqui */
.custom-button {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}"
                      rows={8}
                      className="mt-2 font-mono text-sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use CSS personalizado para criar estilos únicos. Tenha cuidado para não quebrar o layout existente.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Importar/Exportar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={exportTheme} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Tema
                  </Button>
                  
                  <div>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                      id="import-theme"
                    />
                    <Label htmlFor="import-theme" asChild>
                      <Button variant="outline" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Tema
                      </Button>
                    </Label>
                  </div>
                  
                  <Button onClick={resetTheme} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Padrão
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            As alterações são aplicadas em tempo real
          </div>
          <Button onClick={() => setIsOpen(false)}>
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};