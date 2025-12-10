import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NetworkGraph } from '@/components/network/NetworkGraph';
import { LayerLegend } from '@/components/network/LayerLegend';
import { ContactPanel } from '@/components/network/ContactPanel';
import { AddContactDialog } from '@/components/contacts/AddContactDialog';
import { LogConversationDialog } from '@/components/contacts/LogConversationDialog';
import { ActionOverviewPanel } from '@/components/actions/ActionOverviewPanel';
import { NetworkChatInterface } from '@/components/chat/NetworkChatInterface';
import { mockContacts } from '@/data/mockContacts';
import { useContacts, useSeedMockContacts } from '@/hooks/useContacts';
import { useSeedSampleOpportunities } from '@/hooks/useOpportunities';
import { useAuth } from '@/hooks/useAuth';
import { Contact, RelationshipLayer } from '@/types/contact';
import { Users, Plus, LogOut, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const seedMockContacts = useSeedMockContacts();
  const seedSampleOpportunities = useSeedSampleOpportunities();
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<RelationshipLayer | null>(null);
  const [showOnlyAttention, setShowOnlyAttention] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLogConversation, setShowLogConversation] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Use mock data if not authenticated, real data if authenticated
  const displayContacts = user ? (contacts || []) : mockContacts;

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleClosePanel = () => {
    setSelectedContact(null);
  };

  const handleLogConversation = () => {
    if (selectedContact) {
      setShowLogConversation(true);
    }
  };

  const handleEditContact = () => {
    if (selectedContact) {
      setEditingContact(selectedContact);
      setShowAddContact(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleLayerClick = (layer: RelationshipLayer | null) => {
    setSelectedLayer(layer);
  };

  const handleDriftingClick = () => {
    setShowOnlyAttention(!showOnlyAttention);
    // Clear layer filter when toggling drifting
    if (!showOnlyAttention) {
      setSelectedLayer(null);
    }
  };

  const handleSeedContacts = async () => {
    const result = await seedMockContacts.mutateAsync();
    // Wait a moment for contacts to be available, then seed opportunities
    const { data: newContacts } = await supabase.from('contacts').select('id');
    if (newContacts && newContacts.length > 0) {
      await seedSampleOpportunities.mutateAsync(newContacts.map(c => c.id));
    }
  };

  const needsAttentionCount = displayContacts.filter(c => c.needsAttention).length;
  
  const filteredContacts = useMemo(() => {
    let filtered = displayContacts;
    
    // Filter by layer if selected
    if (selectedLayer) {
      filtered = filtered.filter(c => c.layer === selectedLayer);
    }
    
    // Filter by attention if enabled
    if (showOnlyAttention) {
      filtered = filtered.filter(c => c.needsAttention);
    }
    
    return filtered;
  }, [displayContacts, selectedLayer, showOnlyAttention]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showEmptyState = user && !contactsLoading && displayContacts.length === 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b">
          <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowChat(!showChat)}
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
                  >
                    {showChat ? (
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
                    ) : (
                      <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-accent-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {showChat ? 'View Network' : 'Search with AI'}
                </TooltipContent>
              </Tooltip>
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground">
                  {showChat ? 'Search' : 'Network'}
                </h1>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {showChat 
                    ? 'Describe who you\'re looking for'
                    : `${displayContacts.length} contacts · ${needsAttentionCount} need attention`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Button 
                size="sm" 
                className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                  } else {
                    setEditingContact(null);
                    setShowAddContact(true);
                  }
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contact</span>
                <span className="sm:hidden">Add</span>
              </Button>

              {user && (
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="px-2">
                  <LogOut className="w-4 h-4" />
                </Button>
              )}

              {!user && (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="text-xs">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-16 md:pt-20 h-screen">
          {showChat ? (
            <NetworkChatInterface 
              onContactSelect={(contact) => {
                setSelectedContact(contact);
                setShowChat(false);
              }}
            />
          ) : (
            <div className="relative h-full">
              {/* Empty State for authenticated users with no contacts */}
              {showEmptyState ? (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-accent-foreground/50" />
                    </div>
                    <h2 className="text-2xl font-display font-semibold mb-2">No contacts yet</h2>
                    <p className="text-muted-foreground mb-6">
                      Start building your network by adding contacts, or load sample data to explore the app.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => {
                          setEditingContact(null);
                          setShowAddContact(true);
                        }}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Contact
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleSeedContacts}
                        disabled={seedMockContacts.isPending || seedSampleOpportunities.isPending}
                        className="gap-2"
                      >
                        {(seedMockContacts.isPending || seedSampleOpportunities.isPending) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Load Sample Data
                      </Button>
                    </div>
                  </div>
                </div>
              ) : contactsLoading && user ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Network Graph */}
                  <NetworkGraph 
                    contacts={filteredContacts}
                    onContactClick={handleContactClick}
                    selectedLayer={selectedLayer}
                  />

                  {/* Layer Legend - Bottom Center */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <LayerLegend 
                      activeLayer={selectedLayer}
                      onLayerClick={handleLayerClick}
                      showDrifting={showOnlyAttention}
                      onDriftingClick={handleDriftingClick}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Action Overview Panel - Top Left (hidden when contact panel is open or chat is shown) */}
        {user && !showEmptyState && !selectedContact && !showChat && (
          <ActionOverviewPanel
            isOpen={showActionPanel}
            onToggle={() => setShowActionPanel(!showActionPanel)}
          />
        )}
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
              onLogConversation={handleLogConversation}
              onEdit={handleEditContact}
            />
          </>
        )}

        {/* Dialogs */}
        <AddContactDialog
          open={showAddContact}
          onOpenChange={(open) => {
            setShowAddContact(open);
            if (!open) setEditingContact(null);
          }}
          editContact={editingContact || undefined}
        />

        {selectedContact && (
          <LogConversationDialog
            open={showLogConversation}
            onOpenChange={setShowLogConversation}
            contact={selectedContact}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default Index;
