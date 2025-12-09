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
  AlertTriangle,
  Loader2,
  ListTodo
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

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const typeIcons: Record<string, React.ReactNode> = {
  birthday: <Gift className="w-3.5 h-3.5" />,
  follow_up: <MessageCircle className="w-3.5 h-3.5" />,
  milestone: <CalendarDays className="w-3.5 h-3.5" />,
  check_in: <Clock className="w-3.5 h-3.5" />,
  manual: <CheckCircle2 className="w-3.5 h-3.5" />,
  'contact-reminder': <AlertTriangle className="w-3.5 h-3.5" />,
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
  const generateMessage = useGenerateSuggestedMessage();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({});

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
        opportunityType: item.opportunity?.type || 'check_in',
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
    if (item.type === 'opportunity' && item.opportunity) {
      await completeOpportunity.mutateAsync(item.opportunity.id);
    } else if (item.type === 'contact-reminder') {
      toast({ 
        title: 'Reminder dismissed', 
        description: 'Log a conversation to update the last contact date' 
      });
    }
  };

  const isLoading = oppsLoading || contactsLoading;

  const todayItems = actionItems.filter(item => item.dueDate && (isToday(item.dueDate) || (isPast(item.dueDate) && !isToday(item.dueDate))));
  const upcomingItems = actionItems.filter(item => item.dueDate && !isToday(item.dueDate) && !isPast(item.dueDate));

  const todayCount = todayItems.length;
  const totalCount = actionItems.length;

  return (
    <div className="fixed top-24 left-6 z-50">
      <Card className={cn(
        "shadow-xl border-border/50 bg-card/95 backdrop-blur-md transition-all duration-300",
        isOpen ? "w-[320px]" : "w-auto"
      )}>
        {/* Collapsed Header / Toggle */}
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors rounded-t-lg",
            !isOpen && "rounded-b-lg"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Actions</p>
              {!isOpen && (
                <p className="text-xs text-muted-foreground">
                  {todayCount > 0 ? `${todayCount} today` : 'All clear'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {todayCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
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
            <ScrollArea className="max-h-[400px]">
              <div className="p-3 space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : actionItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs">No actions needed</p>
                  </div>
                ) : (
                  <>
                    {/* Today & Overdue */}
                    {todayItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upcoming */}
                    {upcomingItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Upcoming
                        </h3>
                        <div className="space-y-2">
                          {upcomingItems.slice(0, 3).map(item => (
                            <ActionCard
                              key={item.id}
                              item={item}
                              generatedMessage={generatedMessages[item.id]}
                              isGenerating={generatingFor === item.id}
                              onComplete={() => handleComplete(item)}
                              onCopyMessage={handleCopyMessage}
                              onGenerateMessage={() => handleGenerateMessage(item)}
                              compact
                            />
                          ))}
                          {upcomingItems.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center py-1">
                              +{upcomingItems.length - 3} more upcoming
                            </p>
                          )}
                        </div>
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
  compact?: boolean;
}

function ActionCard({ 
  item, 
  generatedMessage, 
  isGenerating, 
  onComplete, 
  onCopyMessage, 
  onGenerateMessage,
  compact = false
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const displayMessage = generatedMessage || item.suggestedMessage;
  const opportunityType = item.opportunity?.type || item.type;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between p-2 rounded-md border bg-card/50",
        item.isOverdue && "border-destructive/30"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn(
            "p-1 rounded",
            item.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {typeIcons[opportunityType] || <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.contact?.name}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px] shrink-0", priorityColors[item.priority])}>
          {getUrgencyLabel(item.dueDate)}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg border bg-card/50 transition-all",
      item.isOverdue && "border-destructive/30"
    )}>
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-md",
              item.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              {typeIcons[opportunityType] || <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.contact?.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", priorityColors[item.priority])}>
            {getUrgencyLabel(item.dueDate)}
          </Badge>
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
