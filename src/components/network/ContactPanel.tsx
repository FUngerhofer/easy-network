import { X, Mail, Phone, Building2, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import { Contact, LAYER_CONFIG } from '@/types/contact';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactPanelProps {
  contact: Contact | null;
  onClose: () => void;
}

export function ContactPanel({ contact, onClose }: ContactPanelProps) {
  if (!contact) return null;

  const config = LAYER_CONFIG[contact.layer];
  const lastContactText = contact.lastContact 
    ? formatDistanceToNow(contact.lastContact, { addSuffix: true })
    : 'Never';

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-lg z-50 animate-slide-in-right">
      {/* Header */}
      <div className="relative p-6 border-b border-border">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2" style={{ borderColor: `hsl(var(--${config.color}))` }}>
            <AvatarImage src={contact.avatar} alt={contact.name} />
            <AvatarFallback 
              className="text-lg font-medium"
              style={{ 
                backgroundColor: `hsl(var(--${config.color}) / 0.15)`,
                color: `hsl(var(--${config.color}))`,
              }}
            >
              {contact.initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              {contact.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="secondary"
                className="text-xs"
                style={{ 
                  backgroundColor: `hsl(var(--${config.color}) / 0.15)`,
                  color: `hsl(var(--${config.color}))`,
                }}
              >
                {config.label}
              </Badge>
              {contact.needsAttention && (
                <Badge variant="destructive" className="text-xs">
                  Needs Attention
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log Conversation
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Contact Information
          </h3>
          
          {contact.email && (
            <a 
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{contact.email}</span>
            </a>
          )}
          
          {contact.phone && (
            <a 
              href={`tel:${contact.phone}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{contact.phone}</span>
            </a>
          )}

          {contact.company && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{contact.company}</span>
            </div>
          )}

          {contact.role && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{contact.role}</span>
            </div>
          )}
        </div>

        {/* Last Contact */}
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last contacted</span>
            <span className={cn(
              "text-sm font-medium",
              contact.needsAttention ? "text-destructive" : "text-foreground"
            )}>
              {lastContactText}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">Contact frequency</span>
            <span className="text-sm font-medium text-foreground capitalize">
              {contact.contactFrequency}
            </span>
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Notes
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {contact.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
