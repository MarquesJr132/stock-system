import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileFormProps {
  title?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
}

export const MobileForm = ({
  title,
  children,
  onSubmit,
  submitLabel = "Guardar",
  submitDisabled = false,
  cancelLabel = "Cancelar",
  onCancel,
  className
}: MobileFormProps) => {
  return (
    <Card className={cn("mobile-card", className)}>
      {title && (
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            {children}
          </div>
          
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="mobile-button flex-1"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitDisabled}
              className="mobile-button flex-1"
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};