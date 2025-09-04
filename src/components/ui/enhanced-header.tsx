import { useState } from 'react';
import { Search, User, LogOut } from 'lucide-react';
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
import { GlobalSearch } from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedHeaderProps {
  onTabChange?: (tab: string) => void;
}

export const EnhancedHeader = ({ onTabChange }: EnhancedHeaderProps) => {
  const [showSearch, setShowSearch] = useState(false);
  const { profile, signOut } = useAuth();

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
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="font-semibold hidden sm:inline">Soluweb</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-muted-foreground gap-2"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Pesquisar...</span>
            <Badge variant="secondary" className="ml-auto text-xs hidden md:inline">
              ⌘K
            </Badge>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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

      {/* Global Search Dialog */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <GlobalSearch 
              onResultSelect={handleSearchResultSelect}
            />
            <div className="p-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowSearch(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};