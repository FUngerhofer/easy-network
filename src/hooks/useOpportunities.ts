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

// Sample opportunities to seed
const sampleOpportunities = [
  { title: "Sarah's Birthday", type: 'birthday' as OpportunityType, priority: 'high' as Priority, daysFromNow: -2 },
  { title: "Follow up on investment opportunity", type: 'follow_up' as OpportunityType, priority: 'high' as Priority, daysFromNow: 0, description: "Discuss the Series B terms" },
  { title: "Work anniversary congratulations", type: 'milestone' as OpportunityType, priority: 'medium' as Priority, daysFromNow: 1, description: "5 years at the company" },
  { title: "Quarterly check-in", type: 'check_in' as OpportunityType, priority: 'medium' as Priority, daysFromNow: -1 },
  { title: "Kid's graduation party invite", type: 'milestone' as OpportunityType, priority: 'high' as Priority, daysFromNow: 0, description: "Emma's high school graduation" },
  { title: "Book recommendation follow-up", type: 'follow_up' as OpportunityType, priority: 'low' as Priority, daysFromNow: -3, description: "Ask how they liked 'Thinking Fast and Slow'" },
  { title: "New job congratulations", type: 'milestone' as OpportunityType, priority: 'high' as Priority, daysFromNow: 0, description: "Just became VP of Engineering" },
  { title: "Wedding anniversary", type: 'milestone' as OpportunityType, priority: 'medium' as Priority, daysFromNow: 1 },
  { title: "Catch up over coffee", type: 'check_in' as OpportunityType, priority: 'medium' as Priority, daysFromNow: -4, description: "Haven't seen in 3 months" },
  { title: "Conference introduction", type: 'manual' as OpportunityType, priority: 'high' as Priority, daysFromNow: 0, description: "Introduce to potential investor at TechCrunch" },
  { title: "Baby shower gift", type: 'milestone' as OpportunityType, priority: 'medium' as Priority, daysFromNow: 1 },
];

export function useSeedSampleOpportunities() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (contactIds.length === 0) {
        throw new Error('No contacts available to assign opportunities');
      }

      const opportunitiesToInsert = sampleOpportunities.map((opp, index) => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + opp.daysFromNow);
        
        return {
          user_id: user.id,
          contact_id: contactIds[index % contactIds.length],
          title: opp.title,
          description: opp.description || null,
          type: opp.type,
          priority: opp.priority,
          due_date: dueDate.toISOString(),
          is_completed: false,
        };
      });

      const { data, error } = await supabase
        .from('opportunities')
        .insert(opportunitiesToInsert)
        .select();
      
      if (error) throw error;
      return data.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({ title: `Added ${count} sample opportunities!` });
    },
    onError: (error) => {
      toast({ title: 'Failed to add sample opportunities', description: error.message, variant: 'destructive' });
    },
  });
}
