import { Contact, LAYER_CONFIG, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ContactNodeProps {
  contact: Contact;
  x: number;
  y: number;
  effectiveLayer: RelationshipLayer;
  onClick: () => void;
}

export function ContactNode({ contact, x, y, effectiveLayer, onClick }: ContactNodeProps) {
  const config = LAYER_CONFIG[effectiveLayer];
  const originalConfig = LAYER_CONFIG[contact.layer];
  const isDrifted = contact.needsAttention;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute z-20 group cursor-pointer transition-all duration-300",
        "hover:scale-110 hover:z-30",
        isDrifted && "animate-drift-out"
      )}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)',
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
