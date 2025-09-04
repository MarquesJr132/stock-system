import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WifiOff, Wifi, RefreshCw, Clock, AlertCircle, CheckCircle, Database } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const OfflineStatus = () => {
  const { syncStatus, manualSync } = useOfflineSync();

  // Always show status indicator, but minimal when online with no pending ops
  const hasIssues = !syncStatus.isOnline || syncStatus.pendingCount > 0 || syncStatus.syncErrors.length > 0;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "relative",
              hasIssues ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20" : "opacity-75 hover:opacity-100"
            )}
          >
            {/* Connection Status Icon */}
            <div className="flex items-center gap-2">
              {syncStatus.isOnline ? (
                <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              
              {/* Pending Operations */}
              {syncStatus.pendingCount > 0 && (
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium">{syncStatus.pendingCount}</span>
                  {syncStatus.isSyncing && (
                    <RefreshCw className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              )}
              
              {/* Errors */}
              {syncStatus.syncErrors.length > 0 && (
                <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              
              {/* Status Text - only show if there are issues */}
              {hasIssues && (
                <span className="text-xs hidden sm:inline">
                  {!syncStatus.isOnline ? 'Offline' : 
                   syncStatus.pendingCount > 0 ? 'Pendente' : 
                   'Online'}
                </span>
              )}
            </div>
          </Button>
        </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {syncStatus.isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                Status de Sincronização
              </DialogTitle>
              <DialogDescription>
                {syncStatus.isOnline 
                  ? "Conectado à internet. As operações serão sincronizadas automaticamente."
                  : "Offline. As operações serão sincronizadas quando a conexão for restabelecida."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status Cards */}
              <div className="grid gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Operações Pendentes</span>
                      </div>
                      <Badge variant="outline">{syncStatus.pendingCount}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {syncStatus.lastSync && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Última Sincronização</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(syncStatus.lastSync, { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {syncStatus.syncErrors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Erros de Sincronização
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {syncStatus.syncErrors.slice(0, 3).map((error, index) => (
                          <p key={index} className="text-xs text-red-600 break-words">
                            {error}
                          </p>
                        ))}
                        {syncStatus.syncErrors.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{syncStatus.syncErrors.length - 3} mais erro(s)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Manual Sync Button */}
              {syncStatus.isOnline && (
                <Button 
                  onClick={manualSync} 
                  disabled={syncStatus.isSyncing}
                  className="w-full"
                  variant="outline"
                >
                  {syncStatus.isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sincronizar Agora
                    </>
                  )}
                </Button>
              )}

              {/* Offline Notice */}
              {!syncStatus.isOnline && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-center text-muted-foreground">
                    A sincronização será automática quando a conexão for restabelecida.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
};