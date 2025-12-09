import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LAYER_CONFIG, LAYER_ORDER, FREQUENCY_OPTIONS, RelationshipLayer, ContactFrequency } from '@/types/contact';
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { Loader2 } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  company: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  layer: z.enum(['vip', 'inner', 'regular', 'occasional', 'distant']),
  contact_frequency: z.enum(['none', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  birthday: z.string().optional(),
  notes: z.string().max(2000).optional(),
  tags: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editContact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    role?: string;
    layer: RelationshipLayer;
    contact_frequency: ContactFrequency;
    birthday?: string;
    notes?: string;
    tags?: string[];
  };
}

export function AddContactDialog({ open, onOpenChange, editContact }: AddContactDialogProps) {
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isEditing = !!editContact;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      layer: 'regular',
      contact_frequency: 'monthly',
    },
  });

  // Reset form when editContact changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editContact) {
        reset({
          name: editContact.name,
          email: editContact.email || '',
          phone: editContact.phone || '',
          company: editContact.company || '',
          role: editContact.role || '',
          layer: editContact.layer,
          contact_frequency: editContact.contact_frequency,
          birthday: editContact.birthday || '',
          notes: editContact.notes || '',
          tags: editContact.tags?.join(', ') || '',
        });
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          company: '',
          role: '',
          layer: 'regular',
          contact_frequency: 'monthly',
          birthday: '',
          notes: '',
          tags: '',
        });
      }
    }
  }, [open, editContact, reset]);

  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const onSubmit = async (data: ContactFormData) => {
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const initials = generateInitials(data.name);

    const contactData = {
      name: data.name,
      initials,
      email: data.email || undefined,
      phone: data.phone || undefined,
      company: data.company || undefined,
      role: data.role || undefined,
      layer: data.layer as RelationshipLayer,
      contact_frequency: data.contact_frequency as ContactFrequency,
      birthday: data.birthday || undefined,
      notes: data.notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    try {
      if (isEditing) {
        await updateContact.mutateAsync({ id: editContact.id, ...contactData });
      } else {
        await createContact.mutateAsync(contactData);
      }
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const isLoading = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="layer">Relationship Layer *</Label>
              <Select
                value={watch('layer')}
                onValueChange={(value) => setValue('layer', value as RelationshipLayer)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  {LAYER_ORDER.map((layer) => (
                    <SelectItem key={layer} value={layer}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: `hsl(var(--${LAYER_CONFIG[layer].color}))` }}
                        />
                        {LAYER_CONFIG[layer].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_frequency">Contact Frequency *</Label>
              <Select
                value={watch('contact_frequency')}
                onValueChange={(value) => setValue('contact_frequency', value as ContactFrequency)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How often?" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...register('email')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 555-0123"
                {...register('phone')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Acme Inc."
                {...register('company')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="CEO"
                {...register('role')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              {...register('birthday')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="Investor, Friend, Mentor"
              {...register('tags')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this contact..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
