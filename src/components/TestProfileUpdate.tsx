import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const TestProfileUpdate = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const testProfileUpdate = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please sign in first",
          variant: "destructive",
        });
        return;
      }

      console.log('Testing profile update for user:', user.id);

      const { data, error } = await supabase.functions.invoke('update-user-profile', {
        body: {
          userId: user.id,
          userName: 'Robert Test',
          companyName: 'Go Absolute Wireless',
          role: 'sales_management',
          salesDescription: 'Sells wireless solutions'
        }
      });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile update result:', data);
      
      toast({
        title: "Profile Update Test",
        description: "Test completed successfully! Check console for details.",
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Profile Update</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testProfileUpdate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing...' : 'Test Profile Update Function'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestProfileUpdate;