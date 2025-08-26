import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CoachCard from "./CoachCard";
import { Trophy, Building, Filter } from "lucide-react";
import { salesLegends as legendsData, industryCoaches as industryData } from "@/data/coaches";
import { supabase } from "@/integrations/supabase/client";

const CoachDirectory = () => {
  const [activeTab, setActiveTab] = useState<"legends" | "industry">("legends");
  const [defaultEmail, setDefaultEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await ((supabase.from as any)("app_settings")
        .select("value")
        .eq("key", "default_home_coach")
        .maybeSingle());
      if (data?.value?.email) setDefaultEmail(data.value.email);
    })();
  }, []);

  const prioritize = (arr: typeof legendsData) => {
    if (!defaultEmail) return arr;
    const copy = [...arr];
    copy.sort((a, b) => (a.email === defaultEmail ? -1 : b.email === defaultEmail ? 1 : 0));
    return copy;
  };

  const salesLegends = useMemo(() => prioritize(legendsData), [defaultEmail]);
  const industryCoaches = useMemo(() => prioritize(industryData), [defaultEmail]);

  useEffect(() => {
    if (!defaultEmail) return;
    const inLegends = legendsData.some(c => c.email === defaultEmail);
    const inIndustry = industryData.some(c => c.email === defaultEmail);
    if (inIndustry && !inLegends) setActiveTab('industry');
  }, [defaultEmail]);

  return (
    <section id="coaches" className="py-20 bg-muted/30 w-full">
      <div className="w-full px-4 mx-auto max-w-none 2xl:px-8 3xl:px-12">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-3xl lg:text-4xl wide:text-5xl ultra:text-6xl font-bold text-foreground">
            Choose Your Perfect Sales Coach
          </h2>
          <p className="text-xl wide:text-2xl ultra:text-3xl text-muted-foreground max-w-4xl wide:max-w-5xl ultra:max-w-6xl mx-auto">
            Get coaching from proven sales legends or industry-specific AI managers 
            who understand your exact challenges and opportunities.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-background border border-border rounded-lg p-1 shadow-card">
            <Button
              variant={activeTab === "legends" ? "premium" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("legends")}
              className="rounded-md"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Sales Legends
            </Button>
            <Button
              variant={activeTab === "industry" ? "premium" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("industry")}
              className="rounded-md"
            >
              <Building className="w-4 h-4 mr-2" />
              Industry Specialists
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter by:</span>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
              All Specialties
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent/10">
              Price Range
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {activeTab === "legends" 
              ? `${salesLegends.length} Sales Legends` 
              : `${industryCoaches.length} Industry Specialists`
            }
          </div>
        </div>

        {/* Coach Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeTab === "legends" 
            ? salesLegends.map((coach, index) => (
                <CoachCard key={index} {...coach} />
              ))
            : industryCoaches.map((coach, index) => (
                <CoachCard key={index} {...coach} />
              ))
          }
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Coaches
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CoachDirectory;