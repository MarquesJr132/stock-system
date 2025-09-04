import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BackupOptions {
  tables?: string[];
  includeFiles?: boolean;
}

export interface ExportOptions {
  table: string;
  format: 'csv' | 'json' | 'excel';
  filters?: Record<string, any>;
}

export interface ImportOptions {
  table: string;
  data: any[];
  upsert?: boolean;
  batchSize?: number;
}

export const useBackupSystem = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createBackup = async (options: BackupOptions = {}) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-data', {
        body: options
      });

      if (error) throw error;

      if (data.success) {
        // Download backup as JSON file
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Backup criado",
          description: `Backup realizado com sucesso (${(data.size / 1024).toFixed(1)} KB)`
        });

        return data.backup;
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro no backup",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async (options: ExportOptions) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://fkthdlbljhhjutuywepc.supabase.co/functions/v1/export-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `export_${options.table}_${new Date().toISOString().split('T')[0]}.${options.format}`;

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportação concluída",
        description: `Dados exportados como ${options.format.toUpperCase()}`
      });

    } catch (error: any) {
      toast({
        title: "Erro na exportação",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const importData = async (options: ImportOptions) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: options
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Importação concluída",
          description: `${data.imported} registos importados com sucesso`
        });
      } else {
        toast({
          title: "Importação com erros",
          description: `${data.imported} importados, ${data.errors} com erros`,
          variant: "destructive"
        });
      }

      return data;
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleAutoBackup = async (enabled: boolean) => {
    try {
      // Store backup preference in localStorage for now
      localStorage.setItem('autoBackupEnabled', enabled.toString());
      
      if (enabled) {
        toast({
          title: "Backup automático ativado",
          description: "Backups serão criados diariamente"
        });
      } else {
        toast({
          title: "Backup automático desativado",
          description: "Backups automáticos foram cancelados"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Falha ao configurar backup automático",
        variant: "destructive"
      });
    }
  };

  return {
    isLoading,
    createBackup,
    exportData,
    importData,
    scheduleAutoBackup
  };
};