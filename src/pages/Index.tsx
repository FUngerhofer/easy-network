import { useState, useMemo } from 'react';
import { NetworkGraph } from '@/components/network/NetworkGraph';
import { LayerLegend } from '@/components/network/LayerLegend';
import { ContactPanel } from '@/components/network/ContactPanel';
import { mockContacts } from '@/data/mockContacts';
import { Contact, RelationshipLayer } from '@/types/contact';
import { Users, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<RelationshipLayer | null>(null);
  const [showOnlyAttention, setShowOnlyAttention] = useState(false);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleClosePanel = () => {
    setSelectedContact(null);
  };

  const needsAttentionCount = mockContacts.filter(c => c.needsAttention).length;
  
  const filteredContacts = useMemo(() => {
    if (showOnlyAttention) {
      return mockContacts.filter(c => c.needsAttention);
    }
    return mockContacts;
  }, [showOnlyAttention]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-foreground">
                Network
              </h1>
              <p className="text-xs text-muted-foreground">
                {mockContacts.length} contacts · {needsAttentionCount} need attention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant={showOnlyAttention ? "default" : "outline"}
              size="sm" 
              className={cn("gap-2", showOnlyAttention && "bg-destructive hover:bg-destructive/90")}
              onClick={() => setShowOnlyAttention(!showOnlyAttention)}
            >
              <AlertCircle className="w-4 h-4" />
              {needsAttentionCount} Need Attention
            </Button>
            
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 h-screen">
        <div className="relative h-full">
          {/* Layer Legend */}
          <div className="absolute left-6 top-6 z-30">
            <LayerLegend 
              activeLayer={hoveredLayer}
              onLayerHover={setHoveredLayer}
            />
          </div>

          {/* Network Graph */}
          <NetworkGraph 
            contacts={filteredContacts}
            onContactClick={handleContactClick}
          />
        </div>
      </main>

      {/* Contact Panel */}
      {selectedContact && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40"
            onClick={handleClosePanel}
          />
          <ContactPanel 
            contact={selectedContact}
            onClose={handleClosePanel}
          />
        </>
      )}
    </div>
  );
};

export default Index;
