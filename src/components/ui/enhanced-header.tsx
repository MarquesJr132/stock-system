import { useState } from 'react';
import { Search, User, LogOut, Moon, Sun, Menu, WifiOff, Wifi, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EnhancedHeaderProps {
  onTabChange?: (tab: string) => void;
}

export const EnhancedHeader = ({ onTabChange }: EnhancedHeaderProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { syncStatus, manualSync } = useOfflineSync();

  const handleSearchResultSelect = (result: any) => {
    setShowSearch(false);
    
    // Navigate based on result type
    switch (result.type) {
      case 'product':
        onTabChange?.('products');
        break;
      case 'customer':
        onTabChange?.('customers');
        break;
      case 'sale':
        onTabChange?.('sales');
        break;
      case 'quotation':
        onTabChange?.('quotations');
        break;
      case 'supplier':
        onTabChange?.('suppliers');
        break;
    }
  };

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="h-8 w-8 p-0" />
        
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="font-semibold hidden sm:inline">Soluweb</span>
        </div>

        {/* Search disabled temporarily */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Offline Status */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 p-1.5 flex items-center gap-1.5",
                  (!syncStatus.isOnline || syncStatus.pendingCount > 0 || syncStatus.syncErrors.length > 0) 
                    ? "text-orange-600 hover:text-orange-700" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {syncStatus.isOnline ? (
                  <Wifi className="h-3.5 w-3.5" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5" />
                )}
                
                {syncStatus.pendingCount > 0 && (
                  <>
                    <Database className="h-3 w-3" />
                    <span className="text-xs font-medium min-w-0">{syncStatus.pendingCount}</span>
                  </>
                )}
                
                {syncStatus.syncErrors.length > 0 && (
                  <AlertCircle className="h-3 w-3" />
                )}
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
                <div className="grid gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Operações Pendentes</span>
                        <Badge variant="outline">{syncStatus.pendingCount}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {syncStatus.lastSync && (
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Última Sincronização</span>
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
                </div>

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
              </div>
            </DialogContent>
          </Dialog>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 p-0"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline truncate max-w-32">
                  {profile?.full_name || 'Utilizador'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange?.('profile')}>
                <User className="h-4 w-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

    </header>
  );
};