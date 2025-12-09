import { X, Mail, Phone, Building2, Briefcase, Calendar, MessageSquare, Gift, Pencil, FileText, Users, MoreHorizontal, Trash2 } from 'lucide-react';
import { Contact, LAYER_CONFIG, FREQUENCY_OPTIONS, CONVERSATION_TYPE_OPTIONS, ConversationType } from '@/types/contact';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useConversations, useDeleteConversation } from '@/hooks/useConversations';
import { Loader2 } from 'lucide-react';

interface ContactPanelProps {
  contact: Contact | null;
  onClose: () => void;
  onLogConversation?: () => void;
  onAddOpportunity?: () => void;
  onEdit?: () => void;
}

const conversationIcons: Record<ConversationType, React.ReactNode> = {
  call: <Phone className="w-3 h-3" />,
  meeting: <Users className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  note: <FileText className="w-3 h-3" />,
  other: <MoreHorizontal className="w-3 h-3" />,
};

export function ContactPanel({ contact, onClose, onLogConversation, onAddOpportunity, onEdit }: ContactPanelProps) {
  const { data: conversations, isLoading: conversationsLoading } = useConversations(contact?.id);
  const deleteConversation = useDeleteConversation();

  if (!contact) return null;

  const config = LAYER_CONFIG[contact.layer];
  const lastContactText = contact.last_contact_at 
    ? formatDistanceToNow(new Date(contact.last_contact_at), { addSuffix: true })
    : 'Never';
  
  const frequencyLabel = FREQUENCY_OPTIONS.find(f => f.value === contact.contact_frequency)?.label || contact.contact_frequency;

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm('Are you sure you want to delete this conversation?')) {
      await deleteConversation.mutateAsync({ id: conversationId, contactId: contact.id });
    }
  };

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
            <AvatarImage src={contact.avatar_url} alt={contact.name} />
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
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="sm" onClick={onLogConversation}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Log Conversation
          </Button>
          <Button variant="outline" size="sm" onClick={onAddOpportunity}>
            <Gift className="w-4 h-4 mr-2" />
            Add Opportunity
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="col-span-2">
            <Pencil className="w-4 h-4 mr-2" />
            Edit Contact
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

          {contact.birthday && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Gift className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                Birthday: {format(new Date(contact.birthday), 'MMMM d')}
              </span>
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
            <span className="text-sm font-medium text-foreground">
              {frequencyLabel}
            </span>
          </div>
        </div>

        {/* Conversation History */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Conversation History
          </h3>
          
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const typeConfig = CONVERSATION_TYPE_OPTIONS.find(t => t.value === conversation.type);
                return (
                  <div 
                    key={conversation.id} 
                    className="p-3 rounded-lg border border-border bg-muted/30 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {conversationIcons[conversation.type as ConversationType]}
                        <span>{typeConfig?.label || conversation.type}</span>
                        <span>·</span>
                        <span>{format(new Date(conversation.occurred_at), 'MMM d, yyyy')}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteConversation(conversation.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {conversation.title && (
                      <p className="text-sm font-medium text-foreground mt-1">{conversation.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {conversation.content}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No conversations logged yet.</p>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Notes
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
