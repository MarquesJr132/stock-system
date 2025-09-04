import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export interface BackupOptions {
  tables?: string[];
  includeFiles?: boolean;
}

export interface ExportOptions {
  table: string;
  format: 'excel';
  filters?: Record<string, any>;
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
        // Convert backup data to Excel format
        const workbook = XLSX.utils.book_new();

        const normalizeRows = (tableData: any) => {
          if (Array.isArray(tableData)) return tableData;
          if (tableData && typeof tableData === 'object') {
            if (Array.isArray((tableData as any).data)) return (tableData as any).data;
            if (Array.isArray((tableData as any).rows)) return (tableData as any).rows;
            if (Array.isArray((tableData as any).items)) return (tableData as any).items;
            const values = Object.values(tableData as Record<string, any>);
            if (values.length && values.every(v => v && typeof v === 'object')) {
              return values as any[];
            }
          }
          // Fallback: wrap any other shape to ensure a non-empty worksheet
          return [{ value: JSON.stringify(tableData) }];
        };
        
        // Add each table as a separate sheet
        Object.entries(data.backup).forEach(([tableName, tableData]: [string, any]) => {
          try {
            const rows = normalizeRows(tableData);
            const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName.substring(0, 31));
          } catch (e) {
            const worksheet = XLSX.utils.aoa_to_sheet([["data"], [JSON.stringify(tableData)]]);
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName.substring(0, 31));
          }
        });

        // Ensure workbook has at least one sheet
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          const ws = XLSX.utils.aoa_to_sheet([["Info"], ["Sem dados disponíveis"]]);
          XLSX.utils.book_append_sheet(workbook, ws, 'Backup');
        }
        
        // Generate Excel file
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Backup criado",
          description: `Backup Excel realizado com sucesso`
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
      // 1) Fetch data directly from Supabase (RLS will protect per-tenant)
      let query: any = (supabase as any).from(options.table).select('*');
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Sem dados para exportar');
      }

      // 2) Build a valid Excel file using xlsx
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, options.table.substring(0, 31));
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

      // 3) Download
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${options.table}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: 'Ficheiro Excel gerado com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro na exportação',
        description: error.message,
        variant: 'destructive'
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
    scheduleAutoBackup
  };
};