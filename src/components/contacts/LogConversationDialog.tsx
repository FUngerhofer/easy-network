import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONVERSATION_TYPE_OPTIONS, ConversationType, Contact } from '@/types/contact';
import { useCreateConversation, useSummarizeConversation } from '@/hooks/useConversations';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Loader2, Mic, MicOff, Sparkles, Phone, Users, Mail, FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const conversationSchema = z.object({
  type: z.enum(['call', 'meeting', 'email', 'note', 'other']),
  title: z.string().max(200).optional(),
  content: z.string().min(1, 'Content is required').max(5000),
  occurred_at: z.string(),
});

type ConversationFormData = z.infer<typeof conversationSchema>;

const iconMap: Record<ConversationType, React.ReactNode> = {
  call: <Phone className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

interface LogConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function LogConversationDialog({ open, onOpenChange, contact }: LogConversationDialogProps) {
  const createConversation = useCreateConversation();
  const summarize = useSummarizeConversation();
  const { isRecording, isTranscribing, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ConversationFormData>({
    resolver: zodResolver(conversationSchema),
    defaultValues: {
      type: 'note',
      occurred_at: new Date().toISOString().slice(0, 16),
      content: '',
    },
  });

  const content = watch('content');

  const handleVoiceRecord = async () => {
    if (isRecording) {
      const transcription = await stopRecording();
      if (transcription) {
        setValue('content', content ? `${content}\n\n${transcription}` : transcription);
      }
    } else {
      await startRecording();
    }
  };

  const handleSummarize = async () => {
    if (!content) return;
    const summary = await summarize.mutateAsync(content);
    if (summary) {
      setValue('content', `${content}\n\n---\n**AI Summary:**\n${summary}`);
    }
  };

  const onSubmit = async (data: ConversationFormData) => {
    try {
      await createConversation.mutateAsync({
        contact_id: contact.id,
        user_id: contact.user_id,
        type: data.type as ConversationType,
        title: data.title || undefined,
        content: data.content,
        occurred_at: new Date(data.occurred_at).toISOString(),
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const isLoading = createConversation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && isRecording) cancelRecording();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-display text-xl">
            Log Conversation with {contact.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2">
                {CONVERSATION_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={watch('type') === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue('type', option.value)}
                  >
                    {iconMap[option.value]}
                    <span className="ml-1">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="Quick catch-up call"
                  {...register('title')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occurred_at">When</Label>
                <Input
                  id="occurred_at"
                  type="datetime-local"
                  {...register('occurred_at')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Notes *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSummarize}
                    disabled={!content || summarize.isPending}
                    className="h-7 text-xs"
                  >
                    {summarize.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    Summarize
                  </Button>
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={handleVoiceRecord}
                    disabled={isTranscribing}
                    className={cn("h-7 text-xs", isRecording && "animate-pulse")}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-3 h-3 mr-1" />
                    ) : (
                      <Mic className="w-3 h-3 mr-1" />
                    )}
                    {isTranscribing ? 'Transcribing...' : isRecording ? 'Stop' : 'Voice'}
                  </Button>
                </div>
              </div>
              <Textarea
                id="content"
                placeholder="What did you discuss? Include any personal details, action items, or important information..."
                rows={6}
                {...register('content')}
                className={errors.content ? 'border-destructive' : ''}
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 flex-shrink-0 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Conversation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
