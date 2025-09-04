import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
}

export const SwipeableCard = ({ 
  children, 
  onEdit, 
  onDelete, 
  onView,
  className 
}: SwipeableCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onEdit && !onDelete && !onView) return;
    
    setIsDragging(true);
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const deltaX = startX.current - currentX.current;
    
    // Only allow left swipe (positive deltaX)
    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 120));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // If swiped more than 60px, show actions, otherwise snap back
    if (swipeOffset > 60) {
      setSwipeOffset(120);
    } else {
      setSwipeOffset(0);
    }
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
  };

  // Click outside to reset swipe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        resetSwipe();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActions = onEdit || onDelete || onView;

  return (
    <div 
      ref={cardRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action buttons background */}
      {hasActions && (
        <div className="absolute right-0 top-0 h-full flex items-center gap-2 px-4 bg-muted/50">
          {onView && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onView();
                resetSwipe();
              }}
              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onEdit();
                resetSwipe();
              }}
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-600/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onDelete();
                resetSwipe();
              }}
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Main card content */}
      <Card 
        className={cn(
          "swipe-action relative bg-background",
          className
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onClick={swipeOffset > 0 ? resetSwipe : undefined}
      >
        {children}
      </Card>
    </div>
  );
};