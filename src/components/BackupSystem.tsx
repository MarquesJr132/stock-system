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
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(
    localStorage.getItem('autoBackupEnabled') === 'true'
  );
  const [importData, setImportData] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const { isLoading, createBackup, exportData, importData: importDataFunc, scheduleAutoBackup } = useBackupSystem();

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

  const handleImport = async () => {
    if (!importData.trim()) return;

    try {
      const data = JSON.parse(importData);
      await importDataFunc({
        table: selectedTable,
        data: Array.isArray(data) ? data : [data],
        upsert: true
      });
      setImportData('');
    } catch (error) {
      console.error('Import error:', error);
    }
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
              Backup Manual
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

        {/* Backup Automático */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Backup Automático
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-backup"
                checked={autoBackupEnabled}
                onCheckedChange={handleAutoBackupToggle}
              />
              <Label htmlFor="auto-backup">Backup diário automático</Label>
            </div>
            {autoBackupEnabled && (
              <div className="p-3 bg-accent/10 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cloud className="h-4 w-4" />
                  Backup será criado automaticamente todos os dias às 02:00
                </div>
              </div>
            )}
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
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'json') => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} disabled={isLoading} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isLoading ? 'Exportando...' : 'Exportar'}
            </Button>
          </CardContent>
        </Card>

        {/* Importar Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tabela de Destino</Label>
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
              <Label>Dados JSON</Label>
              <Textarea
                placeholder="Cole aqui os dados em formato JSON..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={6}
              />
            </div>
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !importData.trim()} 
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isLoading ? 'Importando...' : 'Importar'}
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