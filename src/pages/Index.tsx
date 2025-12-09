import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '@/components/network/NetworkGraph';
import { LayerLegend } from '@/components/network/LayerLegend';
import { ContactPanel } from '@/components/network/ContactPanel';
import { AddContactDialog } from '@/components/contacts/AddContactDialog';
import { LogConversationDialog } from '@/components/contacts/LogConversationDialog';
import { AddOpportunityDialog } from '@/components/contacts/AddOpportunityDialog';
import { mockContacts } from '@/data/mockContacts';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/hooks/useAuth';
import { Contact, RelationshipLayer } from '@/types/contact';
import { Users, Plus, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [hoveredLayer, setHoveredLayer] = useState<RelationshipLayer | null>(null);
  const [showOnlyAttention, setShowOnlyAttention] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showLogConversation, setShowLogConversation] = useState(false);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

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

  const handleAddOpportunity = () => {
    if (selectedContact) {
      setShowAddOpportunity(true);
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

  const needsAttentionCount = displayContacts.filter(c => c.needsAttention).length;
  
  const filteredContacts = useMemo(() => {
    if (showOnlyAttention) {
      return displayContacts.filter(c => c.needsAttention);
    }
    return displayContacts;
  }, [displayContacts, showOnlyAttention]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                {displayContacts.length} contacts · {needsAttentionCount} need attention
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
            
            <Button 
              size="sm" 
              className="gap-2"
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
              Add Contact
            </Button>

            {user && (
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}

            {!user && (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
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
          {contactsLoading && user ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <NetworkGraph 
              contacts={filteredContacts}
              onContactClick={handleContactClick}
            />
          )}
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
            onLogConversation={handleLogConversation}
            onAddOpportunity={handleAddOpportunity}
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
        <>
          <LogConversationDialog
            open={showLogConversation}
            onOpenChange={setShowLogConversation}
            contact={selectedContact}
          />
          <AddOpportunityDialog
            open={showAddOpportunity}
            onOpenChange={setShowAddOpportunity}
            contact={selectedContact}
          />
        </>
      )}
    </div>
  );
};

export default Index;
