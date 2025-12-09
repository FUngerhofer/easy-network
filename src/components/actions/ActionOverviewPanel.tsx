import { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, isThisWeek, isPast, differenceInDays } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Gift, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Sparkles,
  CalendarDays,
  AlertTriangle,
  Loader2
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
  birthday: <Gift className="w-4 h-4" />,
  follow_up: <MessageCircle className="w-4 h-4" />,
  milestone: <CalendarDays className="w-4 h-4" />,
  check_in: <Clock className="w-4 h-4" />,
  manual: <CheckCircle2 className="w-4 h-4" />,
  'contact-reminder': <AlertTriangle className="w-4 h-4" />,
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
      // For contact reminders, we just mark as done (user should log a conversation)
      toast({ 
        title: 'Reminder dismissed', 
        description: 'Log a conversation to update the last contact date' 
      });
    }
  };

  const isLoading = oppsLoading || contactsLoading;

  const todayItems = actionItems.filter(item => item.dueDate && (isToday(item.dueDate) || (isPast(item.dueDate) && !isToday(item.dueDate))));
  const upcomingItems = actionItems.filter(item => item.dueDate && !isToday(item.dueDate) && !isPast(item.dueDate));
  const noDateItems = actionItems.filter(item => !item.dueDate);

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-24 z-50 transition-all duration-300 bg-background shadow-lg",
          isOpen ? "right-[340px]" : "right-4"
        )}
        onClick={onToggle}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>

      {/* Panel */}
      <div
        className={cn(
          "fixed top-20 right-0 h-[calc(100vh-5rem)] w-[340px] bg-background border-l z-40 transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b">
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Action Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {actionItems.length} actions pending
          </p>
        </div>

        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-4 space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No actions needed right now</p>
              </div>
            ) : (
              <>
                {/* Today & Overdue */}
                {todayItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-destructive" />
                      Today & Overdue
                    </h3>
                    <div className="space-y-3">
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
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Upcoming
                    </h3>
                    <div className="space-y-3">
                      {upcomingItems.map(item => (
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

                {/* No Date */}
                {noDateItems.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Anytime
                    </h3>
                    <div className="space-y-3">
                      {noDateItems.map(item => (
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
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

interface ActionCardProps {
  item: ActionItem;
  generatedMessage?: string;
  isGenerating: boolean;
  onComplete: () => void;
  onCopyMessage: (message: string) => void;
  onGenerateMessage: () => void;
}

function ActionCard({ 
  item, 
  generatedMessage, 
  isGenerating, 
  onComplete, 
  onCopyMessage, 
  onGenerateMessage 
}: ActionCardProps) {
  const displayMessage = generatedMessage || item.suggestedMessage;
  const opportunityType = item.opportunity?.type || item.type;

  return (
    <Card className={cn(
      "transition-all",
      item.isOverdue && "border-destructive/50"
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-md",
              item.isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              {typeIcons[opportunityType] || <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{item.contact?.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", priorityColors[item.priority])}>
            {getUrgencyLabel(item.dueDate)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}

        {/* Suggested Message */}
        {displayMessage ? (
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            <p className="text-muted-foreground mb-2">{displayMessage}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => onCopyMessage(displayMessage)}
            >
              <Copy className="w-3 h-3" />
              Copy
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 w-full"
            onClick={onGenerateMessage}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {isGenerating ? 'Generating...' : 'Generate message'}
          </Button>
        )}

        <Separator />

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs gap-1"
          onClick={onComplete}
        >
          <CheckCircle2 className="w-3 h-3" />
          Mark Complete
        </Button>
      </CardContent>
    </Card>
  );
}
