import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityEvent {
  action: string;
  resource: string;
  metadata?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurityMonitor = () => {
  const { profile } = useAuth();
  const lastActivityRef = useRef<Date>(new Date());
  const activityCountRef = useRef<number>(0);
  const suspiciousActivityRef = useRef<boolean>(false);

  const logSecurityEvent = async (event: SecurityEvent) => {
    if (!profile) return;

    try {
      // Log para auditoria interna
      console.log('Security Event:', event);

      // Se for crítico, criar notificação
      if (event.severity === 'critical' || event.severity === 'high') {
        const tenantId = profile.tenant_id || profile.id;
        
        await supabase
          .from('notifications')
          .insert({
            tenant_id: tenantId,
            user_id: profile.user_id,
            title: `Evento de Segurança: ${event.action}`,
            message: `Detectada atividade suspeita: ${event.action} em ${event.resource}`,
            type: 'security_alert',
            priority: event.severity === 'critical' ? 'high' : 'medium',
            metadata: {
              ...event.metadata,
              ip_address: window.location.hostname,
              user_agent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          });
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  const detectSuspiciousActivity = () => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Reset counter se passou mais de 1 minuto
    if (timeSinceLastActivity > 60000) {
      activityCountRef.current = 0;
      suspiciousActivityRef.current = false;
    }
    
    activityCountRef.current++;
    lastActivityRef.current = now;
    
    // Detectar atividade excessiva (mais de 50 ações por minuto)
    if (activityCountRef.current > 50 && !suspiciousActivityRef.current) {
      suspiciousActivityRef.current = true;
      logSecurityEvent({
        action: 'excessive_activity_detected',
        resource: 'user_session',
        severity: 'high',
        metadata: {
          activity_count: activityCountRef.current,
          time_window: '1_minute'
        }
      });
    }
  };

  const monitorDataAccess = (tableName: string, action: string, recordId?: string) => {
    detectSuspiciousActivity();
    
    // Log acesso a dados sensíveis
    if (['customers', 'sales', 'products'].includes(tableName)) {
      logSecurityEvent({
        action: `data_access_${action}`,
        resource: tableName,
        severity: 'low',
        metadata: {
          record_id: recordId,
          table_name: tableName,
          action_type: action
        }
      });
    }
  };

  const monitorTenantIsolation = (attemptedTenantId: string, userTenantId: string) => {
    if (attemptedTenantId !== userTenantId) {
      logSecurityEvent({
        action: 'tenant_isolation_violation',
        resource: 'database_access',
        severity: 'critical',
        metadata: {
          attempted_tenant: attemptedTenantId,
          user_tenant: userTenantId,
          violation_type: 'cross_tenant_access'
        }
      });
    }
  };

  const monitorAuthenticationEvents = (event: string, metadata?: any) => {
    const severityMap: { [key: string]: 'low' | 'medium' | 'high' | 'critical' } = {
      'login_success': 'low',
      'login_failure': 'medium',
      'password_reset_requested': 'medium',
      'multiple_login_failures': 'high',
      'unauthorized_access_attempt': 'critical'
    };

    logSecurityEvent({
      action: event,
      resource: 'authentication',
      severity: severityMap[event] || 'medium',
      metadata
    });
  };

  const monitorStockOperations = (operation: string, productId: string, quantityChange: number) => {
    // Detectar alterações massivas de stock
    if (Math.abs(quantityChange) > 100) {
      logSecurityEvent({
        action: 'large_stock_change',
        resource: 'inventory',
        severity: 'medium',
        metadata: {
          product_id: productId,
          quantity_change: quantityChange,
          operation: operation
        }
      });
    }
  };

  const monitorPermissionChanges = (targetUserId: string, oldRole: string, newRole: string) => {
    logSecurityEvent({
      action: 'permission_change',
      resource: 'user_management',
      severity: 'high',
      metadata: {
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: newRole,
        changed_by: profile?.user_id
      }
    });
  };

  // Setup interceptors para monitoramento automático
  useEffect(() => {
    if (!profile) return;

    // Interceptar chamadas do Supabase para monitoramento
    const originalFrom = supabase.from.bind(supabase);
    supabase.from = function(tableName: string) {
      const table = originalFrom(tableName);
      
      // Override métodos para monitoramento
      const originalSelect = table.select.bind(table);
      const originalInsert = table.insert.bind(table);
      const originalUpdate = table.update.bind(table);
      const originalDelete = table.delete.bind(table);
      
      table.select = function(...args: any[]) {
        monitorDataAccess(tableName, 'read');
        return originalSelect(...args);
      };
      
      table.insert = function(...args: any[]) {
        monitorDataAccess(tableName, 'create');
        return originalInsert(...args);
      };
      
      table.update = function(...args: any[]) {
        monitorDataAccess(tableName, 'update');
        return originalUpdate(...args);
      };
      
      table.delete = function(...args: any[]) {
        monitorDataAccess(tableName, 'delete');
        return originalDelete(...args);
      };
      
      return table;
    };

    return () => {
      // Cleanup - restore original methods
      supabase.from = originalFrom;
    };
  }, [profile]);

  return {
    logSecurityEvent,
    monitorDataAccess,
    monitorTenantIsolation,
    monitorAuthenticationEvents,
    monitorStockOperations,
    monitorPermissionChanges
  };
};