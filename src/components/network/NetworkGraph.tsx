import { useState, useMemo } from 'react';
import { Contact, LAYER_CONFIG, LAYER_ORDER, RelationshipLayer } from '@/types/contact';
import { ContactNode } from './ContactNode';
import { LayerRing } from './LayerRing';
import { CenterNode } from './CenterNode';

interface NetworkGraphProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
}

export function NetworkGraph({ contacts, onContactClick }: NetworkGraphProps) {
  const [hoveredLayer, setHoveredLayer] = useState<RelationshipLayer | null>(null);

  // Group contacts by layer
  const contactsByLayer = useMemo(() => {
    const grouped: Record<RelationshipLayer, Contact[]> = {
      vip: [],
      inner: [],
      regular: [],
      occasional: [],
      distant: [],
    };

    contacts.forEach((contact) => {
      // If needs attention, shift to next layer (visual drift)
      const effectiveLayer = contact.needsAttention && contact.layer !== 'distant'
        ? LAYER_ORDER[LAYER_ORDER.indexOf(contact.layer) + 1]
        : contact.layer;
      grouped[effectiveLayer].push(contact);
    });

    return grouped;
  }, [contacts]);

  // Calculate positions for contacts in each layer
  const positionedContacts = useMemo(() => {
    const result: Array<{ contact: Contact; x: number; y: number; effectiveLayer: RelationshipLayer }> = [];

    LAYER_ORDER.forEach((layer) => {
      const layerContacts = contactsByLayer[layer];
      const radius = LAYER_CONFIG[layer].radius;
      const angleStep = (2 * Math.PI) / Math.max(layerContacts.length, 1);
      const startAngle = -Math.PI / 2; // Start from top

      layerContacts.forEach((contact, index) => {
        const angle = startAngle + angleStep * index + (layer === 'vip' ? 0 : Math.PI / 6);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        result.push({
          contact,
          x,
          y,
          effectiveLayer: layer,
        });
      });
    });

    return result;
  }, [contactsByLayer]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--accent) / 0.05), transparent 70%)',
        }}
      />

      {/* Graph container */}
      <div className="relative" style={{ width: '900px', height: '900px' }}>
        {/* Layer rings - rendered in reverse order for proper z-index */}
        {[...LAYER_ORDER].reverse().map((layer) => (
          <LayerRing
            key={layer}
            layer={layer}
            isHovered={hoveredLayer === layer}
            onHover={setHoveredLayer}
          />
        ))}

        {/* Center node (You) */}
        <CenterNode />

        {/* Contact nodes */}
        {positionedContacts.map(({ contact, x, y, effectiveLayer }) => (
          <ContactNode
            key={contact.id}
            contact={contact}
            x={x}
            y={y}
            effectiveLayer={effectiveLayer}
            onClick={() => onContactClick(contact)}
          />
        ))}
      </div>
    </div>
  );
}
