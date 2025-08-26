import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Pipeline = () => {
  const { toast } = useToast();

  const handleViewPipeline = () => {
    toast({
      title: "Pipeline View",
      description: "Pipeline functionality coming soon!",
    });
  };

  return (
    <section className="py-16 px-4 bg-muted/30 w-full">
      <div className="w-full px-4 mx-auto max-w-none 2xl:px-8 3xl:px-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Your Sales Pipeline</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your deals, monitor progress, and get AI-powered insights to close more sales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+3 from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$127,500</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">Due this week</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button 
            onClick={handleViewPipeline}
            size="lg"
            className="gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            View Full Pipeline
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pipeline;