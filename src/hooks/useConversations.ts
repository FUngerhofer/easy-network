import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, ConversationType } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';

export function useConversations(contactId?: string) {
  return useQuery({
    queryKey: ['conversations', contactId],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select('*')
        .order('occurred_at', { ascending: false });
      
      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: contactId !== undefined,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conversation: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('conversations')
        .insert({ ...conversation, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the contact's last_contact_at
      await supabase
        .from('contacts')
        .update({ last_contact_at: conversation.occurred_at })
        .eq('id', conversation.contact_id);
      
      return data as Conversation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Conversation logged successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to log conversation', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', contactId] });
      toast({ title: 'Conversation deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete conversation', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSummarizeConversation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { action: 'summarize', text },
      });
      
      if (error) throw error;
      return data.summary as string;
    },
    onError: (error) => {
      toast({ title: 'Failed to summarize', description: error.message, variant: 'destructive' });
    },
  });
}
