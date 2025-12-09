import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RelationshipLayer, OpportunityType } from '@/types/contact';

interface GenerateMessageInput {
  contactName: string;
  contactLayer: RelationshipLayer;
  opportunityType: OpportunityType | string;
  opportunityTitle: string;
  opportunityDescription?: string;
}

export function useGenerateSuggestedMessage() {
  return useMutation({
    mutationFn: async (input: GenerateMessageInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('generate-message', {
        body: input,
      });

      if (error) throw error;
      return data.message;
    },
  });
}
