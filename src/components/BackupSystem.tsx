import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useBackupSystem } from '@/hooks/useBackupSystem';
import { 
  Download, 
  Upload, 
  Database, 
  FileSpreadsheet, 
  FileJson, 
  Calendar,
  Cloud,
  RefreshCw
} from 'lucide-react';

export const BackupSystem = () => {
  const [selectedTable, setSelectedTable] = useState('products');
  const [exportFormat, setExportFormat] = useState<'excel'>('excel');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(
    localStorage.getItem('autoBackupEnabled') === 'true'
  );
  const [importData, setImportData] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const { isLoading, createBackup, exportData, scheduleAutoBackup } = useBackupSystem();

  const tables = [
    { value: 'products', label: 'Produtos' },
    { value: 'customers', label: 'Clientes' },
    { value: 'sales', label: 'Vendas' },
    { value: 'suppliers', label: 'Fornecedores' },
    { value: 'stock_movements', label: 'Movimentos de Stock' }
  ];

  const handleBackup = async () => {
    await createBackup({
      tables: selectedTables.length > 0 ? selectedTables : undefined,
      includeFiles: true
    });
  };

  const handleExport = async () => {
    await exportData({
      table: selectedTable,
      format: exportFormat
    });
  };


  const handleAutoBackupToggle = async (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    await scheduleAutoBackup(enabled);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Manual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tabelas para Backup</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {tables.map((table) => (
                  <label key={table.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTables([...selectedTables, table.value]);
                        } else {
                          setSelectedTables(selectedTables.filter(t => t !== table.value));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleBackup} disabled={isLoading} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Criando...' : 'Criar Backup'}
            </Button>
          </CardContent>
        </Card>


        {/* Exportar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tabela</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Formato</Label>
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm font-medium">Excel (.xlsx)</span>
              </div>
            </div>
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Exportando...' : 'Exportar'}
            </Button>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronização Multi-dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sincronização Automática</h3>
            <p className="text-muted-foreground">
              Os dados são sincronizados automaticamente entre todos os dispositivos conectados.
              Todas as alterações são refletidas em tempo real.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};