export type RelationshipLayer = 'vip' | 'inner' | 'regular' | 'occasional' | 'distant';
export type ContactFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type ConversationType = 'call' | 'meeting' | 'email' | 'note' | 'other';
export type OpportunityType = 'birthday' | 'anniversary' | 'follow_up' | 'event' | 'manual';
export type Priority = 'low' | 'medium' | 'high';

export interface FamilyMember {
  name: string;
  relationship: string;
  birthday?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  initials: string;
  layer: RelationshipLayer;
  contact_frequency: ContactFrequency;
  last_contact_at?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
  birthday?: string;
  family_members?: FamilyMember[];
  created_at: string;
  updated_at: string;
  // Computed properties for UI
  needsAttention?: boolean;
}

export interface Conversation {
  id: string;
  contact_id: string;
  user_id: string;
  type: ConversationType;
  title?: string;
  content: string;
  summary?: string;
  action_items?: string[];
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  contact_id: string;
  user_id: string;
  title: string;
  description?: string;
  type: OpportunityType;
  due_date?: string;
  priority: Priority;
  is_completed: boolean;
  completed_at?: string;
  suggested_message?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: Contact;
}

export const LAYER_CONFIG: Record<RelationshipLayer, { 
  label: string; 
  color: string;
  radius: number;
  description: string;
}> = {
  vip: { 
    label: 'VIP', 
    color: 'layer-vip',
    radius: 80,
    description: 'Your closest relationships'
  },
  inner: { 
    label: 'Inner Circle', 
    color: 'layer-inner',
    radius: 160,
    description: 'Close friends & key contacts'
  },
  regular: { 
    label: 'Regular', 
    color: 'layer-regular',
    radius: 240,
    description: 'Maintain regular contact'
  },
  occasional: { 
    label: 'Occasional', 
    color: 'layer-occasional',
    radius: 320,
    description: 'Touch base periodically'
  },
  distant: { 
    label: 'Distant', 
    color: 'layer-distant',
    radius: 400,
    description: 'Reconnect when relevant'
  },
};

export const LAYER_ORDER: RelationshipLayer[] = ['vip', 'inner', 'regular', 'occasional', 'distant'];

export const FREQUENCY_OPTIONS: { value: ContactFrequency; label: string; days: number }[] = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'biweekly', label: 'Every 2 weeks', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'yearly', label: 'Yearly', days: 365 },
];

export const CONVERSATION_TYPE_OPTIONS: { value: ConversationType; label: string; icon: string }[] = [
  { value: 'call', label: 'Phone Call', icon: 'Phone' },
  { value: 'meeting', label: 'Meeting', icon: 'Users' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'note', label: 'Note', icon: 'FileText' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

export const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-destructive' },
];
