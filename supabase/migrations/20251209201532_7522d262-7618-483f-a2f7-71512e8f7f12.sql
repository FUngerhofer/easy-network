-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  initials TEXT NOT NULL,
  layer TEXT NOT NULL DEFAULT 'regular' CHECK (layer IN ('vip', 'inner', 'regular', 'occasional', 'distant')),
  contact_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (contact_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  last_contact_at TIMESTAMP WITH TIME ZONE,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT,
  notes TEXT,
  tags TEXT[],
  birthday DATE,
  family_members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('call', 'meeting', 'email', 'note', 'other')),
  title TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  action_items TEXT[],
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table (todos/reminders)
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('birthday', 'anniversary', 'follow_up', 'event', 'manual')),
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  suggested_message TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contacts
CREATE POLICY "Users can view their own contacts" 
  ON public.contacts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" 
  ON public.contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
  ON public.contacts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
  ON public.contacts FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
  ON public.conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON public.conversations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON public.conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for opportunities
CREATE POLICY "Users can view their own opportunities" 
  ON public.opportunities FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opportunities" 
  ON public.opportunities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities" 
  ON public.opportunities FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunities" 
  ON public.opportunities FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_layer ON public.contacts(layer);
CREATE INDEX idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_opportunities_contact_id ON public.opportunities(contact_id);
CREATE INDEX idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX idx_opportunities_due_date ON public.opportunities(due_date);
CREATE INDEX idx_opportunities_is_completed ON public.opportunities(is_completed);