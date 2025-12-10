import { useState, useMemo, useCallback, useEffect } from 'react';
import { Contact, LAYER_CONFIG, LAYER_ORDER, RelationshipLayer } from '@/types/contact';
import { ContactNode } from './ContactNode';
import { LayerRing } from './LayerRing';
import { CenterNode } from './CenterNode';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface NetworkGraphProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  selectedLayer?: RelationshipLayer | null;
}

// Generate a seeded random number based on contact id for consistent positioning
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash)) ;
}

export function NetworkGraph({ contacts, onContactClick, selectedLayer }: NetworkGraphProps) {
  const [hoveredLayer, setHoveredLayer] = useState<RelationshipLayer | null>(null);
  const [contactAngles, setContactAngles] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set initial zoom for mobile
  useEffect(() => {
    if (isMobile) {
      setZoom(0.45);
    } else {
      setZoom(1);
    }
  }, [isMobile]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.3));
  const handleZoomReset = () => setZoom(isMobile ? 0.45 : 1);

  // Calculate positions for contacts - drifting on edge, others within ring
  const positionedContacts = useMemo(() => {
    const result: Array<{ contact: Contact; x: number; y: number; angle: number; radius: number; effectiveLayer: RelationshipLayer }> = [];

    // Get layer boundaries
    const getLayerBounds = (layer: RelationshipLayer) => {
      const layerIndex = LAYER_ORDER.indexOf(layer);
      const outerRadius = LAYER_CONFIG[layer].radius;
      const innerRadius = layerIndex > 0 ? LAYER_CONFIG[LAYER_ORDER[layerIndex - 1]].radius + 15 : 45;
      return { innerRadius, outerRadius };
    };

    contacts.forEach((contact) => {
      const isDrifting = contact.needsAttention;
      
      // Determine effective layer for drifting contacts
      const effectiveLayer = isDrifting && contact.layer !== 'distant'
        ? LAYER_ORDER[LAYER_ORDER.indexOf(contact.layer) + 1]
        : contact.layer;
      
      const { innerRadius, outerRadius } = getLayerBounds(effectiveLayer);
      
      // Use seeded random for consistent angle
      const randomAngle = seededRandom(contact.id) * Math.PI * 2;
      const angle = contactAngles[contact.id] ?? randomAngle;
      
      let radius: number;
      if (isDrifting) {
        // Drifting contacts sit on the outer edge of their effective layer
        radius = outerRadius;
      } else {
        // Normal contacts are randomly distributed within the ring
        const randomRadius = seededRandom(contact.id + 'radius');
        radius = innerRadius + (outerRadius - innerRadius) * (0.3 + randomRadius * 0.5);
      }
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      result.push({
        contact,
        x,
        y,
        angle,
        radius,
        effectiveLayer,
      });
    });

    return result;
  }, [contacts, contactAngles]);

  const handleAngleChange = useCallback((contactId: string, newAngle: number) => {
    setContactAngles(prev => ({ ...prev, [contactId]: newAngle }));
  }, []);

  // Determine which layers to show
  const visibleLayers = selectedLayer ? [selectedLayer] : LAYER_ORDER;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--accent) / 0.05), transparent 70%)',
        }}
      />

      {/* Zoom Controls */}
      <div className="absolute bottom-20 md:bottom-6 right-4 md:right-6 z-30 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          className="h-9 w-9 md:h-10 md:w-10 bg-card/90 backdrop-blur-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomReset}
          className="h-9 w-9 md:h-10 md:w-10 bg-card/90 backdrop-blur-sm"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          className="h-9 w-9 md:h-10 md:w-10 bg-card/90 backdrop-blur-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Graph container */}
      <div 
        className="relative transition-transform duration-200 ease-out"
        style={{ 
          width: '900px', 
          height: '900px',
          transform: `scale(${zoom})`,
        }}
      >
        {/* Layer rings - rendered in reverse order for proper z-index */}
        {[...LAYER_ORDER].reverse().map((layer) => (
          <LayerRing
            key={layer}
            layer={layer}
            isHovered={hoveredLayer === layer}
            onHover={setHoveredLayer}
            isVisible={visibleLayers.includes(layer)}
          />
        ))}

        {/* Center node (You) */}
        <CenterNode />

        {/* Contact nodes */}
        {positionedContacts.map(({ contact, x, y, angle, radius, effectiveLayer }) => (
          <ContactNode
            key={contact.id}
            contact={contact}
            x={x}
            y={y}
            angle={angle}
            radius={radius}
            effectiveLayer={effectiveLayer}
            onClick={() => onContactClick(contact)}
            onAngleChange={handleAngleChange}
          />
        ))}
      </div>
    </div>
  );
}
