import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isThisWeek, isPast, differenceInDays } from 'date-fns';
import { 
  ChevronDown,
  ChevronUp,
  Gift, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Sparkles,
  CalendarDays,
  HandMetal,
  Loader2,
  ListTodo,
  X,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useOpportunities, useCompleteOpportunity } from '@/hooks/useOpportunities';
import { useContacts } from '@/hooks/useContacts';
import { useGenerateSuggestedMessage } from '@/hooks/useGenerateSuggestedMessage';
import { useCreateConversation } from '@/hooks/useConversations';
import { Opportunity, Contact, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';

interface ActionOverviewPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface ActionItem {
  id: string;
  type: 'opportunity' | 'contact-reminder';
  title: string;
  description?: string;
  contact: Contact;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  suggestedMessage?: string;
  opportunity?: Opportunity;
  isOverdue?: boolean;
}

const typeColors: Record<string, string> = {
  birthday: 'border-pink-400',
  anniversary: 'border-violet-400',
  follow_up: 'border-sky-400',
  event: 'border-emerald-400',
  manual: 'border-slate-400',
  'contact-reminder': 'border-amber-400',
};

const typeIcons: Record<string, React.ReactNode> = {
  birthday: <Gift className="w-3.5 h-3.5" />,
  anniversary: <CalendarDays className="w-3.5 h-3.5" />,
  follow_up: <MessageCircle className="w-3.5 h-3.5" />,
  event: <CalendarDays className="w-3.5 h-3.5" />,
  manual: <CheckCircle2 className="w-3.5 h-3.5" />,
  'contact-reminder': <HandMetal className="w-3.5 h-3.5" />,
};

function getUrgencyLabel(date: Date | undefined): string {
  if (!date) return 'No date';
  if (isPast(date) && !isToday(date)) return 'Overdue';
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isThisWeek(date)) return 'This week';
  return format(date, 'MMM d');
}

function getUrgencyOrder(date: Date | undefined): number {
  if (!date) return 999;
  if (isPast(date) && !isToday(date)) return 0;
  if (isToday(date)) return 1;
  if (isTomorrow(date)) return 2;
  if (isThisWeek(date)) return 3;
  return 4 + differenceInDays(date, new Date());
}

function getContactReminderDueDate(contact: Contact): Date | undefined {
  if (!contact.last_contact_at || contact.contact_frequency === 'none') return undefined;
  
  const lastContact = new Date(contact.last_contact_at);
  const frequencyDays: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
  };
  
  const days = frequencyDays[contact.contact_frequency] || 30;
  const dueDate = new Date(lastContact);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

export function ActionOverviewPanel({ isOpen, onToggle }: ActionOverviewPanelProps) {
  const { toast } = useToast();
  const { data: opportunities = [], isLoading: oppsLoading } = useOpportunities();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const completeOpportunity = useCompleteOpportunity();
  const createConversation = useCreateConversation();
  const generateMessage = useGenerateSuggestedMessage();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);

  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    // Add opportunities (not completed)
    opportunities
      .filter(opp => !opp.is_completed)
      .forEach(opp => {
        const dueDate = opp.due_date ? new Date(opp.due_date) : undefined;
        items.push({
          id: opp.id,
          type: 'opportunity',
          title: opp.title,
          description: opp.description || undefined,
          contact: opp.contact!,
          dueDate,
          priority: (opp.priority as 'low' | 'medium' | 'high') || 'medium',
          suggestedMessage: opp.suggested_message || undefined,
          opportunity: opp,
          isOverdue: dueDate ? isPast(dueDate) && !isToday(dueDate) : false,
        });
      });

    // Add contact reminders for contacts needing attention
    contacts
      .filter(c => c.needsAttention && c.contact_frequency !== 'none')
      .forEach(contact => {
        const dueDate = getContactReminderDueDate(contact);
        // Skip if there's already an opportunity for this contact due soon
        const hasRecentOpp = items.some(
          item => item.contact?.id === contact.id && item.dueDate && isThisWeek(item.dueDate)
        );
        
        if (!hasRecentOpp) {
          const priorityByLayer: Record<string, 'low' | 'medium' | 'high'> = {
            vip: 'high',
            inner: 'high',
            regular: 'medium',
            occasional: 'low',
            distant: 'low',
          };
          
          items.push({
            id: `reminder-${contact.id}`,
            type: 'contact-reminder',
            title: `Reach out to ${contact.name}`,
            description: contact.last_contact_at 
              ? `Last contact: ${format(new Date(contact.last_contact_at), 'MMM d, yyyy')}`
              : 'Never contacted',
            contact,
            dueDate,
            priority: priorityByLayer[contact.layer] || 'medium',
            isOverdue: dueDate ? isPast(dueDate) : true,
          });
        }
      });

    // Sort by urgency
    return items.sort((a, b) => getUrgencyOrder(a.dueDate) - getUrgencyOrder(b.dueDate));
  }, [opportunities, contacts]);

  const handleCopyMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
    toast({ title: 'Message copied to clipboard' });
  };

  const handleGenerateMessage = async (item: ActionItem) => {
    setGeneratingFor(item.id);
    try {
      const message = await generateMessage.mutateAsync({
        contactName: item.contact.name,
        contactLayer: item.contact.layer as RelationshipLayer,
        opportunityType: item.opportunity?.type || 'follow_up',
        opportunityTitle: item.title,
        opportunityDescription: item.description,
      });
      setGeneratedMessages(prev => ({ ...prev, [item.id]: message }));
    } catch (error) {
      toast({ 
        title: 'Failed to generate message', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleComplete = async (item: ActionItem) => {
    // Log a conversation for this action
    if (item.contact) {
      await createConversation.mutateAsync({
        contact_id: item.contact.id,
        user_id: '', // Will be set by hook
        type: 'note',
        content: `Completed: ${item.title}${item.description ? ` - ${item.description}` : ''}`,
        title: item.title,
        occurred_at: new Date().toISOString(),
      });
    }

    if (item.type === 'opportunity' && item.opportunity) {
      await completeOpportunity.mutateAsync(item.opportunity.id);
    }
    
    toast({ title: 'Marked as done', description: 'Conversation logged automatically' });
  };

  const handleDismiss = (itemId: string) => {
    setDismissedIds(prev => new Set([...prev, itemId]));
    toast({ title: 'Action dismissed' });
  };

  const handleRestore = (itemId: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    toast({ title: 'Action restored' });
  };

  const isLoading = oppsLoading || contactsLoading;

  const activeItems = actionItems.filter(item => !dismissedIds.has(item.id));
  const dismissedItems = actionItems.filter(item => dismissedIds.has(item.id));

  const todayItems = activeItems.filter(item => item.dueDate && (isToday(item.dueDate) || (isPast(item.dueDate) && !isToday(item.dueDate))));
  const upcomingItems = activeItems.filter(item => item.dueDate && !isToday(item.dueDate) && !isPast(item.dueDate));

  const todayCount = todayItems.length;
  const totalCount = activeItems.length;

  return (
    <div className="fixed top-24 left-6 z-50">
      <Card className={cn(
        "shadow-xl border-border/50 bg-card/95 backdrop-blur-md transition-all duration-300",
        isOpen ? "w-[380px]" : "w-auto"
      )}>
        {/* Collapsed Header / Toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors rounded-t-lg",
            !isOpen && "rounded-b-lg"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-display font-medium">Actions</p>
          </div>
          <div className="flex items-center gap-4">
            {todayCount > 0 && (
              <Badge className="text-xs px-1.5 py-0 bg-amber-500 hover:bg-amber-500 text-white border-0">
                {todayCount}
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {isOpen && (
          <>
            <Separator />
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : activeItems.length === 0 && dismissedItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs">No actions needed</p>
                  </div>
                ) : (
                  <>
                    {todayItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Today & Overdue
                        </h3>
                        <div className="space-y-2">
                          {todayItems.map(item => (
                            <ActionCard
                              key={item.id}
                              item={item}
                              generatedMessage={generatedMessages[item.id]}
                              isGenerating={generatingFor === item.id}
                              onComplete={() => handleComplete(item)}
                              onCopyMessage={handleCopyMessage}
                              onGenerateMessage={() => handleGenerateMessage(item)}
                              onDismiss={() => handleDismiss(item.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {upcomingItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2">
                          Upcoming
                        </h3>
                        <div className="space-y-2">
                          {upcomingItems.map(item => (
                            <ActionCard
                              key={item.id}
                              item={item}
                              generatedMessage={generatedMessages[item.id]}
                              isGenerating={generatingFor === item.id}
                              onComplete={() => handleComplete(item)}
                              onCopyMessage={handleCopyMessage}
                              onGenerateMessage={() => handleGenerateMessage(item)}
                              onDismiss={() => handleDismiss(item.id)}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dismissed Section */}
                    {dismissedItems.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowDismissed(!showDismissed)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2 hover:text-foreground transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                          Dismissed ({dismissedItems.length})
                          {showDismissed ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        {showDismissed && (
                          <div className="space-y-2">
                            {dismissedItems.map(item => (
                              <DismissedCard
                                key={item.id}
                                item={item}
                                onRestore={() => handleRestore(item.id)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </Card>
    </div>
  );
}

interface ActionCardProps {
  item: ActionItem;
  generatedMessage?: string;
  isGenerating: boolean;
  onComplete: () => void;
  onCopyMessage: (message: string) => void;
  onGenerateMessage: () => void;
  onDismiss: () => void;
  compact?: boolean;
}

function ActionCard({ 
  item, 
  generatedMessage, 
  isGenerating, 
  onComplete, 
  onCopyMessage, 
  onGenerateMessage,
  onDismiss,
  compact = false
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayMessage = generatedMessage || item.suggestedMessage;
  const opportunityType = item.opportunity?.type || item.type;
  const urgencyLabel = getUrgencyLabel(item.dueDate);

  const typeColor = typeColors[opportunityType] || 'border-slate-400';

  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between p-2 rounded-md border-l-2 border bg-card/50 group",
        typeColor
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-muted text-muted-foreground">
            {typeIcons[opportunityType] || <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.contact?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] shrink-0",
              urgencyLabel === 'Overdue' 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {urgencyLabel}
          </Badge>
          <button
            onClick={onDismiss}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border-l-2 border bg-card/50 transition-all group", typeColor)}>
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
              {typeIcons[opportunityType] || <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.contact?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px]",
                urgencyLabel === 'Overdue' 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {urgencyLabel}
            </Badge>
            <button
              onClick={onDismiss}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1 flex-1"
            onClick={onComplete}
          >
            <CheckCircle2 className="w-3 h-3" />
            Done
          </Button>
          
          {displayMessage ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => onCopyMessage(displayMessage)}
            >
              <Copy className="w-3 h-3" />
              Copy
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={onGenerateMessage}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI
            </Button>
          )}
        </div>

        {/* Generated Message */}
        {displayMessage && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">{displayMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface DismissedCardProps {
  item: ActionItem;
  onRestore: () => void;
}

function DismissedCard({ item, onRestore }: DismissedCardProps) {
  const opportunityType = item.opportunity?.type || item.type;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-muted/30 opacity-60">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded bg-muted text-muted-foreground">
          {typeIcons[opportunityType] || <CheckCircle2 className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{item.title}</p>
          <p className="text-[10px] text-muted-foreground">{item.contact?.name}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1"
        onClick={onRestore}
      >
        <RotateCcw className="w-3 h-3" />
        Restore
      </Button>
    </div>
  );
}
