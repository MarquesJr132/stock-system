import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log('Current URL:', window.location.href);
      console.log('Current URL params:', Object.fromEntries(searchParams.entries()));
      console.log('Current session:', session);
      
      // Check if we have the recovery session from URL fragments (Supabase auth uses fragments)
      const urlHash = window.location.hash;
      console.log('URL hash:', urlHash);
      
      // Parse the hash fragment for auth tokens
      const hashParams = new URLSearchParams(urlHash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
      
      // Also check URL search params as fallback
      const searchType = searchParams.get('type');
      const tokenHash = searchParams.get('token_hash');
      
      console.log('Search params:', { type: searchType, tokenHash: !!tokenHash });
      
      if (type === 'recovery' && accessToken) {
        try {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          console.log('Set session result:', { data: !!data, error });
          
          if (error) {
            console.error('Session setup failed:', error);
            toast({
              title: "Link inválido",
              description: "Este link de redefinição de senha é inválido ou expirou.",
              variant: "destructive",
            });
            navigate('/');
          } else {
            console.log('Session setup successful');
            setIsValidSession(true);
          }
        } catch (error) {
          console.error('Error setting up session:', error);
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao verificar o link.",
            variant: "destructive",
          });
          navigate('/');
        }
      } else if (searchType === 'recovery' && tokenHash) {
        try {
          // Handle the old token_hash format
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          console.log('Verify OTP result:', { data: !!data, error });
          
          if (error) {
            console.error('Token verification failed:', error);
            toast({
              title: "Link inválido",
              description: "Este link de redefinição de senha é inválido ou expirou.",
              variant: "destructive",
            });
            navigate('/');
          } else {
            console.log('Token verified successfully');
            setIsValidSession(true);
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao verificar o link.",
            variant: "destructive",
          });
          navigate('/');
        }
      } else if (session) {
        // If there's already an active session, allow password reset
        console.log('Active session found, allowing password reset');
        setIsValidSession(true);
      } else {
        console.log('No valid recovery parameters or session found');
        console.log('URL params available:', Object.fromEntries(searchParams.entries()));
        console.log('Hash fragment:', urlHash);
        toast({
          title: "Link inválido",
          description: "Este link de redefinição de senha é inválido ou expirou. Verifique se clicou no link correto do email.",
          variant: "destructive",
        });
        // Don't navigate away immediately, give user a chance to see the error
        setTimeout(() => navigate('/'), 3000);
      }
      
      setSessionChecked(true);
    };

    if (!sessionChecked) {
      handlePasswordReset();
    }
  }, [searchParams, navigate, toast, session, sessionChecked]);

  // Show loading while checking session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando link...</p>
        </div>
      </div>
    );
  }

  // Don't render the form if the session is not valid
  if (!isValidSession) {
    return null;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await updatePassword(password);

    if (error) {
      toast({
        title: "Erro ao redefinir senha",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Senha redefinida com sucesso!",
        description: "Sua senha foi alterada. Você pode fazer login com a nova senha.",
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <KeyRound className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/')}
            >
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;