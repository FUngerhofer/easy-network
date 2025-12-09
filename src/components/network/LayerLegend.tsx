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
  onLayerHover?: (layer: RelationshipLayer | null) => void;
}

export function LayerLegend({ activeLayer, onLayerHover }: LayerLegendProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="glass-panel rounded-lg px-3 py-2 shadow-md animate-fade-in">
        <div className="flex items-center gap-2">
          {LAYER_ORDER.map((layer) => {
            const config = LAYER_CONFIG[layer];
            const isActive = activeLayer === layer;
            
            return (
              <Tooltip key={layer}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200",
                      "hover:bg-accent/50",
                      isActive && "bg-accent/50"
                    )}
                    onMouseEnter={() => onLayerHover?.(layer)}
                    onMouseLeave={() => onLayerHover?.(null)}
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
                <TooltipContent side="bottom" className="text-xs">
                  {config.description}
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs text-muted-foreground">Drifting</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Contacts needing your attention
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
