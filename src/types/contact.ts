export type RelationshipLayer = 'vip' | 'inner' | 'regular' | 'occasional' | 'distant';

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  layer: RelationshipLayer;
  lastContact?: Date;
  contactFrequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  needsAttention: boolean;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tags?: string[];
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
