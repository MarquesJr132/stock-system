import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, hint, type = "text", ...props }, ref) => {
    const getInputMode = () => {
      switch (type) {
        case "email":
          return "email";
        case "tel":
          return "tel";
        case "number":
          return "numeric";
        case "url":
          return "url";
        default:
          return "text";
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          type={type}
          inputMode={getInputMode()}
          className={cn(
            "mobile-input",
            error && "border-destructive focus:border-destructive",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = "MobileInput";