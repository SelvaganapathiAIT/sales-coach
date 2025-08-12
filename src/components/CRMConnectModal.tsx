import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CRMOption {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  icon: React.ElementType;
  requiresApiKey: boolean;
  oauthSupported: boolean;
  popular?: boolean;
}

const crmOptions: CRMOption[] = [
  {
    id: "callproof",
    name: "CallProof",
    description: "Sales conversation intelligence and call analytics",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: false,
    popular: true
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Popular inbound marketing and sales platform",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: true,
    popular: true
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "World's leading CRM platform",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: true,
    popular: true
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sales-focused CRM and pipeline management",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: true,
    popular: true
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Comprehensive business management suite",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: true
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Work management platform with CRM features",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: false
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Flexible database and project management",
    icon: Database,
    requiresApiKey: true,
    oauthSupported: false
  }
];

interface CRMConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (crmId: string, crmName: string) => void;
}

export function CRMConnectModal({ open, onOpenChange, onConnect }: CRMConnectModalProps) {
  const [selectedCRM, setSelectedCRM] = useState<CRMOption | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleSelectCRM = (crm: CRMOption) => {
    setSelectedCRM(crm);
    setApiKey("");
    setApiSecret("");
    setInstanceUrl("");
  };

  const handleConnect = async () => {
    if (!selectedCRM) return;

    setIsConnecting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save CRM connection to Supabase
      const { error: crmError } = await supabase
        .from('crm_connections')
        .upsert({
          user_id: user.id,
          crm_type: selectedCRM.id,
          crm_name: selectedCRM.name,
          api_key: apiKey,
          api_secret: apiSecret || null,
          instance_url: instanceUrl || null,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,crm_type'
        });

      if (crmError) {
        console.error('Error saving CRM connection:', crmError);
        throw new Error(`Failed to save ${selectedCRM.name} connection`);
      }

      // Store CRM connection info in localStorage for immediate use
      const crmConnection = {
        id: selectedCRM.id,
        name: selectedCRM.name,
        apiKey: apiKey,
        apiSecret: apiSecret,
        instanceUrl: instanceUrl,
        connectedAt: new Date().toISOString()
      };
      
      localStorage.setItem('crmConnection', JSON.stringify(crmConnection));

      // For CallProof, also update the legacy fields in profiles table for backward compatibility
      if (selectedCRM.id === 'callproof') {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            callproof_enabled: true,
            callproof_api_key: apiKey,
            callproof_api_secret: apiSecret,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (profileError) {
          console.warn('Warning: Could not update CallProof legacy fields in profiles:', profileError);
          // Don't fail the entire operation for this
        }
      }
      
      // Add a small delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onConnect(selectedCRM.id, selectedCRM.name);
      onOpenChange(false);
      
      toast({
        title: "CRM Connected",
        description: `Successfully connected to ${selectedCRM.name}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to the CRM. Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOAuthConnect = (crm: CRMOption) => {
    // TODO: Implement OAuth flow
    toast({
      title: "OAuth Coming Soon",
      description: `OAuth integration for ${crm.name} will be available soon. Use API key for now.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Connect Your CRM
          </DialogTitle>
          <DialogDescription>
            Choose your CRM platform to unlock advanced coaching features and pipeline insights.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CRM Selection */}
          <div>
            <h3 className="font-medium mb-4">Select Your CRM Platform</h3>
            <div className="space-y-3">
              {crmOptions.map((crm) => {
                const IconComponent = crm.icon;
                const isSelected = selectedCRM?.id === crm.id;
                
                return (
                  <Card 
                    key={crm.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectCRM(crm)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{crm.name}</h4>
                            {crm.popular && (
                              <Badge variant="secondary" className="text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {crm.description}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Connection Form */}
          <div>
            {selectedCRM ? (
              <div>
                <h3 className="font-medium mb-4">Connect to {selectedCRM.name}</h3>
                
                <div className="space-y-4">
                  {selectedCRM.oauthSupported && (
                    <div>
                      <Button 
                        onClick={() => handleOAuthConnect(selectedCRM)}
                        className="w-full"
                        variant="outline"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Connect with OAuth (Recommended)
                      </Button>
                      <div className="text-center my-3 text-sm text-muted-foreground">
                        or
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder={`Enter your ${selectedCRM.name} API key`}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>

                    {selectedCRM.id === 'callproof' && (
                      <div>
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          placeholder="Enter your CallProof API secret"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                        />
                      </div>
                    )}

                    {(selectedCRM.id === 'salesforce' || selectedCRM.id === 'hubspot') && (
                      <div>
                        <Label htmlFor="instanceUrl">
                          Instance URL {selectedCRM.id === 'salesforce' ? '(Salesforce)' : '(HubSpot Portal)'}
                        </Label>
                        <Input
                          id="instanceUrl"
                          placeholder={
                            selectedCRM.id === 'salesforce' 
                              ? "https://yourcompany.salesforce.com" 
                              : "https://app.hubspot.com"
                          }
                          value={instanceUrl}
                          onChange={(e) => setInstanceUrl(e.target.value)}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={handleConnect}
                      disabled={!apiKey || (selectedCRM.id === 'callproof' && !apiSecret) || isConnecting}
                      className="w-full"
                    >
                      {isConnecting ? "Connecting..." : `Connect to ${selectedCRM.name}`}
                    </Button>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium mb-2">How to find your API credentials:</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selectedCRM.id === 'callproof' && (
                        <>
                          <p>1. Log into your CallProof account</p>
                          <p>2. Go to Settings → Integrations → API Keys</p>
                          <p>3. Generate a new API key or copy existing one</p>
                          <p>4. Copy both the API Key and API Secret</p>
                          <p className="font-medium text-orange-600">Note: You need BOTH the API Key AND API Secret for CallProof</p>
                        </>
                      )}
                      {selectedCRM.id === 'hubspot' && (
                        <>
                          <p>1. Go to Settings → Integrations → API key</p>
                          <p>2. Click "Create key" if you don't have one</p>
                          <p>3. Copy the generated API key</p>
                        </>
                      )}
                      {selectedCRM.id === 'salesforce' && (
                        <>
                          <p>1. Go to Setup → Apps → App Manager</p>
                          <p>2. Create a Connected App or use existing</p>
                          <p>3. Get Consumer Key and Consumer Secret</p>
                        </>
                      )}
                      {selectedCRM.id === 'pipedrive' && (
                        <>
                          <p>1. Go to Settings → Personal → API</p>
                          <p>2. Copy your personal API token</p>
                        </>
                      )}
                      {selectedCRM.id === 'zoho' && (
                        <>
                          <p>1. Go to Setup → Developer Space → API</p>
                          <p>2. Create a Server-based Application</p>
                          <p>3. Get Client ID and Client Secret</p>
                        </>
                      )}
                      {(selectedCRM.id === 'monday' || selectedCRM.id === 'airtable') && (
                        <>
                          <p>1. Go to your account settings</p>
                          <p>2. Find the API section</p>
                          <p>3. Generate or copy your API key</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-muted-foreground">Select a CRM to get started</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Choose your CRM platform from the list to begin the connection process.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}