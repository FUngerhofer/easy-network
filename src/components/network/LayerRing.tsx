import { LAYER_CONFIG, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';

interface LayerRingProps {
  layer: RelationshipLayer;
  isHovered: boolean;
  onHover: (layer: RelationshipLayer | null) => void;
}

export function LayerRing({ layer, isHovered, onHover }: LayerRingProps) {
  const config = LAYER_CONFIG[layer];
  const diameter = config.radius * 2;

  return (
    <div
      className={cn(
        "absolute rounded-full border transition-all duration-500",
        "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        isHovered && "border-opacity-100"
      )}
      style={{
        width: diameter,
        height: diameter,
        borderColor: `hsl(var(--${config.color}))`,
        borderWidth: isHovered ? '2px' : '1px',
        backgroundColor: isHovered 
          ? `hsl(var(--${config.color}) / 0.05)` 
          : 'transparent',
        opacity: isHovered ? 1 : 0.3,
      }}
      onMouseEnter={() => onHover(layer)}
      onMouseLeave={() => onHover(null)}
    />
  );
}
