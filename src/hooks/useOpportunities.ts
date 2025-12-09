import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Opportunity, OpportunityType, Priority, Contact } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

function mapDbOpportunityToOpportunity(dbOpp: any): Opportunity {
  return {
    id: dbOpp.id,
    contact_id: dbOpp.contact_id,
    user_id: dbOpp.user_id,
    title: dbOpp.title,
    description: dbOpp.description,
    type: dbOpp.type as OpportunityType,
    due_date: dbOpp.due_date,
    priority: dbOpp.priority as Priority,
    is_completed: dbOpp.is_completed,
    completed_at: dbOpp.completed_at,
    suggested_message: dbOpp.suggested_message,
    is_recurring: dbOpp.is_recurring,
    recurrence_pattern: dbOpp.recurrence_pattern,
    created_at: dbOpp.created_at,
    updated_at: dbOpp.updated_at,
    contact: dbOpp.contact ? {
      ...dbOpp.contact,
      needsAttention: false,
    } as Contact : undefined,
  };
}

export function useOpportunities(contactId?: string) {
  return useQuery({
    queryKey: ['opportunities', contactId],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select('*, contact:contacts(*)')
        .order('due_date', { ascending: true });
      
      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(mapDbOpportunityToOpportunity);
    },
  });
}

interface CreateOpportunityInput {
  contact_id: string;
  title: string;
  description?: string;
  type: OpportunityType;
  due_date?: string;
  priority: Priority;
  is_completed?: boolean;
  suggested_message?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (opportunity: CreateOpportunityInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('opportunities')
        .insert({ ...opportunity, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return mapDbOpportunityToOpportunity(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities', variables.contact_id] });
      toast({ title: 'Opportunity created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create opportunity', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateOpportunityInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbOpportunityToOpportunity(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Opportunity updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update opportunity', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCompleteOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update({ 
          is_completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbOpportunityToOpportunity(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Marked as complete!' });
    },
    onError: (error) => {
      toast({ title: 'Failed to complete', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: 'Opportunity deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    },
  });
}
