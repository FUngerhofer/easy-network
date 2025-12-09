import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact, RelationshipLayer, ContactFrequency, FREQUENCY_OPTIONS, FamilyMember } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

function calculateNeedsAttention(contact: Omit<Contact, 'needsAttention'>): boolean {
  if (!contact.last_contact_at) return true;
  
  const lastContact = new Date(contact.last_contact_at);
  const now = new Date();
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  const frequencyConfig = FREQUENCY_OPTIONS.find(f => f.value === contact.contact_frequency);
  const thresholdDays = frequencyConfig ? frequencyConfig.days * 0.8 : 30;
  
  return daysSinceContact >= thresholdDays;
}

function mapDbContactToContact(dbContact: any): Contact {
  return {
    id: dbContact.id,
    user_id: dbContact.user_id,
    name: dbContact.name,
    avatar_url: dbContact.avatar_url,
    initials: dbContact.initials,
    layer: dbContact.layer as RelationshipLayer,
    contact_frequency: dbContact.contact_frequency as ContactFrequency,
    last_contact_at: dbContact.last_contact_at,
    email: dbContact.email,
    phone: dbContact.phone,
    company: dbContact.company,
    role: dbContact.role,
    notes: dbContact.notes,
    tags: dbContact.tags,
    birthday: dbContact.birthday,
    family_members: dbContact.family_members as FamilyMember[] | undefined,
    created_at: dbContact.created_at,
    updated_at: dbContact.updated_at,
    needsAttention: calculateNeedsAttention({
      ...dbContact,
      layer: dbContact.layer as RelationshipLayer,
      contact_frequency: dbContact.contact_frequency as ContactFrequency,
    }),
  };
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(mapDbContactToContact);
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return mapDbContactToContact(data);
    },
    enabled: !!id,
  });
}

interface CreateContactInput {
  name: string;
  initials: string;
  layer: RelationshipLayer;
  contact_frequency: ContactFrequency;
  avatar_url?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
  birthday?: string;
  family_members?: FamilyMember[];
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contact: CreateContactInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: any = { 
        ...contact, 
        user_id: user.id,
        family_members: contact.family_members || [],
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbContactToContact(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateContactInput> & { id: string }) => {
      const updateData: any = { ...updates };
      
      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbContactToContact(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete contact', description: error.message, variant: 'destructive' });
    },
  });
}
