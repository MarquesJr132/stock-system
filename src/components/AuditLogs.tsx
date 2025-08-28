import React, { useState, useEffect } from "react";
import { Shield, Search, Filter, Download, Eye } from "lucide-react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data?: any;
  new_data?: any;
  timestamp: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

const actionMap: Record<string, { label: string; color: string }> = {
  INSERT: { label: 'Criação', color: 'bg-green-500' },
  UPDATE: { label: 'Atualização', color: 'bg-blue-500' },
  DELETE: { label: 'Exclusão', color: 'bg-red-500' },
};

const tableMap: Record<string, string> = {
  products: 'Produtos',
  customers: 'Clientes',
  sales: 'Vendas',
  suppliers: 'Fornecedores',
  purchase_orders: 'Ordens de Compra',
  profiles: 'Usuários',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { isAdministrator, isSuperuser } = useAuth();
  const { toast } = useToast();

  const canViewAuditLogs = isAdministrator || isSuperuser;

  const fetchAuditLogs = async () => {
    try {
      // First get audit logs
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

      if (auditError) throw auditError;

      // Then get user profiles for the user_ids in audit logs
      const userIds = [...new Set(auditData?.map(log => log.user_id).filter(Boolean))];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Create a map of user_id to profile
      const profileMap = new Map();
      profilesData.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });
      
      const formattedLogs: AuditLog[] = (auditData || []).map(log => ({
        id: log.id,
        table_name: log.table_name,
        record_id: log.record_id,
        action: log.action,
        old_data: log.old_data,
        new_data: log.new_data,
        timestamp: log.timestamp,
        user_id: log.user_id,
        ip_address: typeof log.ip_address === 'string' ? log.ip_address : null,
        user_agent: log.user_agent,
        profiles: log.user_id ? profileMap.get(log.user_id) : null
      }));
      
      setLogs(formattedLogs);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs de auditoria",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const excelData = filteredLogs.map(log => ({
        'Data/Hora': new Date(log.timestamp).toLocaleString('pt-BR'),
        'Usuário': log.profiles?.full_name || 'Sistema',
        'Tabela': tableMap[log.table_name] || log.table_name,
        'Ação': actionMap[log.action]?.label || log.action,
        'Registro ID': log.record_id,
        'IP': log.ip_address || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs de Auditoria');

      // Auto-adjust column widths
      const maxWidth = 50;
      const colWidths = Object.keys(excelData[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...excelData.map(row => String(row[key as keyof typeof row] || '').length)
          ),
          maxWidth
        )
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `logs_auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);

      toast({
        title: "Sucesso",
        description: "Logs exportados para Excel com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os logs",
        variant: "destructive",
      });
    }
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const formatJsonData = (data: any) => {
    if (!data) return 'N/A';
    return JSON.stringify(data, null, 2);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesTable && matchesAction;
  });

  useEffect(() => {
    if (canViewAuditLogs) {
      fetchAuditLogs();
    }
  }, [canViewAuditLogs]);

  if (!canViewAuditLogs) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para acessar os logs de auditoria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Logs de Auditoria
            </CardTitle>
            <Button onClick={exportLogs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                <SelectItem value="products">Produtos</SelectItem>
                <SelectItem value="customers">Clientes</SelectItem>
                <SelectItem value="sales">Vendas</SelectItem>
                <SelectItem value="suppliers">Fornecedores</SelectItem>
                <SelectItem value="purchase_orders">Ordens de Compra</SelectItem>
                <SelectItem value="profiles">Usuários</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando logs de auditoria...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro ID</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {log.profiles?.full_name || 'Sistema'}
                        </span>
                        {log.profiles?.email && (
                          <span className="text-xs text-muted-foreground">
                            {log.profiles.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tableMap[log.table_name] || log.table_name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-white ${actionMap[log.action]?.color || 'bg-gray-500'}`}
                      >
                        {actionMap[log.action]?.label || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.record_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewLogDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || tableFilter !== 'all' || actionFilter !== 'all'
                ? 'Nenhum log encontrado para os filtros aplicados.'
                : 'Nenhum log de auditoria encontrado.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label>Usuário</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.profiles?.full_name || 'Sistema'}
                  </p>
                </div>
                <div>
                  <Label>Tabela</Label>
                  <p className="text-sm text-muted-foreground">
                    {tableMap[selectedLog.table_name] || selectedLog.table_name}
                  </p>
                </div>
                <div>
                  <Label>Ação</Label>
                  <Badge className={`${actionMap[selectedLog.action]?.color || 'bg-gray-500'} text-white`}>
                    {actionMap[selectedLog.action]?.label || selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <Label>ID do Registro</Label>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {selectedLog.record_id}
                  </code>
                </div>
                <div>
                  <Label>Endereço IP</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.ip_address || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {selectedLog.old_data && (
                  <div>
                    <Label>Dados Anteriores</Label>
                    <ScrollArea className="h-64 w-full border rounded p-2">
                      <pre className="text-xs">
                        {formatJsonData(selectedLog.old_data)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <Label>Dados Novos</Label>
                    <ScrollArea className="h-64 w-full border rounded p-2">
                      <pre className="text-xs">
                        {formatJsonData(selectedLog.new_data)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};