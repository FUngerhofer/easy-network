import { LAYER_CONFIG, LAYER_ORDER, RelationshipLayer } from '@/types/contact';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LayerLegendProps {
  activeLayer?: RelationshipLayer | null;
  onLayerClick?: (layer: RelationshipLayer | null) => void;
  showDrifting?: boolean;
  onDriftingClick?: () => void;
}

export function LayerLegend({ activeLayer, onLayerClick, showDrifting, onDriftingClick }: LayerLegendProps) {
  const handleClick = (layer: RelationshipLayer) => {
    if (activeLayer === layer) {
      onLayerClick?.(null); // Deselect if clicking the same layer
    } else {
      onLayerClick?.(layer);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="glass-panel rounded-full px-4 py-2 shadow-lg animate-fade-in">
        <div className="flex items-center gap-1">
          {LAYER_ORDER.map((layer) => {
            const config = LAYER_CONFIG[layer];
            const isActive = activeLayer === layer;
            
            return (
              <Tooltip key={layer}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
                      "hover:bg-accent/50",
                      isActive && "bg-accent ring-2 ring-primary/30"
                    )}
                    onClick={() => handleClick(layer)}
                  >
                    <div 
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-transform duration-200",
                        isActive && "scale-125"
                      )}
                      style={{ backgroundColor: `hsl(var(--${config.color}))` }}
                    />
                    <span className={cn(
                      "text-xs font-medium transition-colors",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {config.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {config.description}
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200",
                  "hover:bg-accent/50",
                  showDrifting && "bg-destructive/10 ring-2 ring-destructive/30"
                )}
                onClick={onDriftingClick}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full bg-destructive",
                  !showDrifting && "animate-pulse"
                )} />
                <span className={cn(
                  "text-xs font-medium transition-colors",
                  showDrifting ? "text-destructive" : "text-muted-foreground"
                )}>
                  Drifting
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showDrifting ? 'Click to show all contacts' : 'Click to filter contacts needing attention'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
