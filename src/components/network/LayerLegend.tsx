import { LAYER_CONFIG, LAYER_ORDER, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';

interface LayerLegendProps {
  activeLayer?: RelationshipLayer | null;
  onLayerHover?: (layer: RelationshipLayer | null) => void;
}

export function LayerLegend({ activeLayer, onLayerHover }: LayerLegendProps) {
  return (
    <div className="glass-panel rounded-xl p-5 shadow-md animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wide">
        Relationship Layers
      </h3>
      
      <div className="space-y-3">
        {LAYER_ORDER.map((layer) => {
          const config = LAYER_CONFIG[layer];
          const isActive = activeLayer === layer;
          
          return (
            <button
              key={layer}
              className={cn(
                "flex items-center gap-3 w-full text-left transition-all duration-200",
                "hover:translate-x-1",
                isActive && "translate-x-1"
              )}
              onMouseEnter={() => onLayerHover?.(layer)}
              onMouseLeave={() => onLayerHover?.(null)}
            >
              <div 
                className={cn(
                  "w-3 h-3 rounded-full transition-transform duration-200",
                  isActive && "scale-125"
                )}
                style={{ backgroundColor: `hsl(var(--${config.color}))` }}
              />
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {config.label}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {config.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span>Contacts drifting out need your attention</span>
        </div>
      </div>
    </div>
  );
}
