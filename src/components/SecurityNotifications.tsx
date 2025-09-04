import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  timestamp: string;
  source: string;
  metadata?: any;
}

export const SecurityNotifications = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'administrator' || profile?.role === 'superuser') {
      fetchSecurityAlerts();
    }
  }, [profile]);

  const fetchSecurityAlerts = async () => {
    try {
      setLoading(true);
      
      // Buscar notificações de segurança dos últimos 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .in('type', ['security_alert', 'tenant_isolation_violation', 'stock_alert', 'data_limit_exceeded'])
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching security alerts:', error);
        return;
      }

      const securityAlerts: SecurityAlert[] = (notifications || []).map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.priority === 'high' ? 'critical' : 
              notification.priority === 'medium' ? 'warning' : 'info',
        timestamp: notification.created_at,
        source: notification.type,
        metadata: notification.metadata
      }));

      setAlerts(securityAlerts);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markAsRead = async (alertId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', alertId);
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  if (!profile || (profile.role !== 'administrator' && profile.role !== 'superuser')) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alertas de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Alertas de Segurança
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alerta de segurança nos últimos 7 dias</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                variant={getAlertVariant(alert.type) as any}
                className="relative"
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <AlertTitle className="mb-1 flex items-center justify-between">
                      <span>{alert.title}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(alert.timestamp)}
                      </div>
                    </AlertTitle>
                    <AlertDescription className="mb-2">
                      {alert.message}
                    </AlertDescription>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {alert.source.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                        className="text-xs"
                      >
                        Marcar como lido
                      </Button>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};