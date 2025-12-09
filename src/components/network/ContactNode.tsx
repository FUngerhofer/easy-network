import { useState, useRef, useCallback } from 'react';
import { Contact, LAYER_CONFIG, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ContactNodeProps {
  contact: Contact;
  x: number;
  y: number;
  angle: number;
  radius: number;
  effectiveLayer: RelationshipLayer;
  onClick: () => void;
  onAngleChange?: (contactId: string, newAngle: number) => void;
}

export function ContactNode({ 
  contact, 
  x, 
  y, 
  angle,
  radius,
  effectiveLayer, 
  onClick,
  onAngleChange 
}: ContactNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentX, setCurrentX] = useState(x);
  const [currentY, setCurrentY] = useState(y);
  const hasDraggedRef = useRef(false);
  const nodeRef = useRef<HTMLButtonElement>(null);
  
  const originalConfig = LAYER_CONFIG[contact.layer];
  const isDrifted = contact.needsAttention;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasDraggedRef.current = false;
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      
      // Only start dragging if moved more than 5px
      if (deltaX > 5 || deltaY > 5) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }
      
      if (!hasDraggedRef.current || !nodeRef.current) return;
      
      const parent = nodeRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const mouseX = moveEvent.clientX - rect.left - centerX;
      const mouseY = moveEvent.clientY - rect.top - centerY;
      
      const newAngle = Math.atan2(mouseY, mouseX);
      const newX = Math.cos(newAngle) * radius;
      const newY = Math.sin(newAngle) * radius;
      
      setCurrentX(newX);
      setCurrentY(newY);
      onAngleChange?.(contact.id, newAngle);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [radius, contact.id, onAngleChange]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger click if we haven't dragged
    if (!hasDraggedRef.current) {
      onClick();
    }
  }, [onClick]);

  const displayX = isDragging ? currentX : x;
  const displayY = isDragging ? currentY : y;

  return (
    <button
      ref={nodeRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute z-20 group transition-all duration-300",
        isDragging ? "cursor-grabbing scale-110 z-40" : "cursor-grab hover:scale-110 hover:z-30",
        isDrifted && !isDragging && "animate-pulse-soft"
      )}
      style={{
        left: `calc(50% + ${displayX}px)`,
        top: `calc(50% + ${displayY}px)`,
        transform: 'translate(-50%, -50%)',
        transition: isDragging ? 'none' : undefined,
      }}
    >
      {/* Ring indicator */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          "group-hover:scale-125 group-hover:opacity-50",
          isDrifted ? "animate-pulse" : ""
        )}
        style={{
          border: `2px solid hsl(var(--${originalConfig.color}))`,
          margin: '-4px',
          borderRadius: '50%',
          width: 'calc(100% + 8px)',
          height: 'calc(100% + 8px)',
          opacity: isDrifted ? 0.8 : 0.5,
        }}
      />

      {/* Avatar */}
      <Avatar className="w-12 h-12 border-2 border-card shadow-md transition-shadow duration-300 group-hover:shadow-lg">
        <AvatarImage src={contact.avatar} alt={contact.name} />
        <AvatarFallback 
          className="text-sm font-medium"
          style={{ 
            backgroundColor: `hsl(var(--${originalConfig.color}) / 0.15)`,
            color: `hsl(var(--${originalConfig.color}))`,
          }}
        >
          {contact.initials}
        </AvatarFallback>
      </Avatar>

      {/* Name label */}
      <div 
        className={cn(
          "absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md",
          "bg-card/90 backdrop-blur-sm border border-border/50",
          "text-xs font-medium text-foreground whitespace-nowrap",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "shadow-sm"
        )}
      >
        {contact.name}
      </div>

      {/* Attention indicator */}
      {isDrifted && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-pulse"
          title="Needs attention"
        />
      )}
    </button>
  );
}
