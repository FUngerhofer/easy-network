import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contact, OpportunityType, Priority, PRIORITY_OPTIONS } from '@/types/contact';
import { useCreateOpportunity } from '@/hooks/useOpportunities';
import { Loader2, Gift, Calendar, Bell, Target, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

const opportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(['birthday', 'anniversary', 'follow_up', 'event', 'manual']),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  suggested_message: z.string().max(500).optional(),
  is_recurring: z.boolean().optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

const typeOptions: { value: OpportunityType; label: string; icon: React.ReactNode }[] = [
  { value: 'birthday', label: 'Birthday', icon: <Gift className="w-4 h-4" /> },
  { value: 'anniversary', label: 'Anniversary', icon: <Calendar className="w-4 h-4" /> },
  { value: 'follow_up', label: 'Follow Up', icon: <Bell className="w-4 h-4" /> },
  { value: 'event', label: 'Event', icon: <Target className="w-4 h-4" /> },
  { value: 'manual', label: 'Custom', icon: <Pencil className="w-4 h-4" /> },
];

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function AddOpportunityDialog({ open, onOpenChange, contact }: AddOpportunityDialogProps) {
  const createOpportunity = useCreateOpportunity();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      type: 'manual',
      priority: 'medium',
      is_recurring: false,
    },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: OpportunityFormData) => {
    try {
      await createOpportunity.mutateAsync({
        contact_id: contact.id,
        title: data.title,
        description: data.description || undefined,
        type: data.type as OpportunityType,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        priority: data.priority as Priority,
        suggested_message: data.suggested_message || undefined,
        is_recurring: data.is_recurring || false,
        is_completed: false,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const isLoading = createOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Add Opportunity for {contact.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedType === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValue('type', option.value)}
                >
                  {option.icon}
                  <span className="ml-1">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Send birthday wishes, Follow up on project"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                {...register('due_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as Priority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={option.color}>{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add more details about this opportunity..."
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggested_message">Suggested Message</Label>
            <Textarea
              id="suggested_message"
              placeholder="A message you can copy and send..."
              rows={2}
              {...register('suggested_message')}
            />
            <p className="text-xs text-muted-foreground">
              This message will be shown when the opportunity is due, ready to copy and send.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              {...register('is_recurring')}
              className="rounded border-border"
            />
            <Label htmlFor="is_recurring" className="font-normal">
              Recurring (e.g., yearly birthday)
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Opportunity
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
