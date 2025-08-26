import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Edit, Users, TrendingUp, Calendar, HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";

import Footer from "@/components/Footer";
import enterpriseSalesCoach from "@/assets/enterprise-sales-coach.jpg";
import inboundSalesCoach from "@/assets/inbound-sales-coach.jpg";
import { supabase } from "@/integrations/supabase/client";

const CoachManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [defaultCoach, setDefaultCoach] = useState<{ email?: string; name?: string; title?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Initial coach data
  const initialCoaches = [
    {
      id: 0,
      name: "Bobby Hartline",
      description: "Your personal AI sales coach for cold calling mastery and prospecting excellence",
      status: "Active",
      repsAssigned: 1,
      avgPerformance: "100%",
      lastUpdated: "Just now",
      image: "/lovable-uploads/d9f95472-dc0b-4dd5-90af-1f2fdb49a565.png",
      isDefault: true
    },
    {
      id: 1,
      name: "Jack Daly Sales Coach",
      description: "Specializes in cold calling and prospecting techniques",
      status: "Active",
      repsAssigned: 12,
      avgPerformance: "94%",
      lastUpdated: "2 days ago",
      image: "/src/assets/jack-daly.jpg"
    },
    {
      id: 2,
      name: "Enterprise Sales Coach",
      description: "Focused on large deal closures and enterprise relationships",
      status: "Active",
      repsAssigned: 8,
      avgPerformance: "89%",
      lastUpdated: "1 week ago",
      image: enterpriseSalesCoach
    },
    {
      id: 3,
      name: "Inbound Sales Coach",
      description: "Optimized for lead qualification and inbound conversions",
      status: "Draft",
      repsAssigned: 0,
      avgPerformance: "N/A",
      lastUpdated: "3 days ago",
      image: inboundSalesCoach
    }
  ];

  // State for coaches with localStorage persistence
  const [coaches, setCoaches] = useState<any[]>(initialCoaches);

  useEffect(() => {
    async function fetchCoaches() {
      try {
        const data = await getOwnCoaches();
        setCoaches(data);
      } catch (err) {
        console.error("Failed to fetch coaches:", err);
      }
    }
    fetchCoaches();
  }, []);


  function timeAgo(dateString: string | null): string {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    const intervals: [number, string][] = [
      [31536000, "year"],
      [2592000, "month"],
      [86400, "day"],
      [3600, "hour"],
      [60, "minute"],
      [1, "second"],
    ];

    for (const [secondsInUnit, label] of intervals) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${label}${interval !== 1 ? "s" : ""} ago`;
      }
    }

    return "just now";
  }
  async function getOwnCoaches() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return [];
    if (!user?.id) { setIsAdmin(false); return; }
    // Check if user is admin
    const { data: isAdminRole, error: adminErr } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (adminErr) throw adminErr;

    let coaches = [];

    // 1. If admin, fetch ALL coaches
    if (isAdminRole) {
      const { data: allCoaches, error: allErr } = await supabase
        .from("coaches")
        .select("*");

      if (allErr) throw allErr;

      coaches = allCoaches || [];
    } else {
      // 2. Try coaches owned by this user
      const { data: owned, error: ownedErr } = await supabase
        .from("coaches")
        .select("*")
        .eq("owner_user_id", user.id);

      if (ownedErr) throw ownedErr;

      coaches = owned || [];

      // 3. If none, check coaches via coach_users (membership link table)
      if (coaches.length === 0) {
        const { data: linked, error: linkedErr } = await supabase
          .from("coach_users")
          .select(`
            coach_id,
            coaches (
              id,
              name,
              description,
              is_draft,
              updated_at,
              avatar_url
            )
          `)
          .eq("user_id", user.id);

        if (linkedErr) throw linkedErr;

        // Flatten results
        coaches = (linked || []).map(row => row.coaches).filter(Boolean);
      }
    }

    // 4. Format result
    return coaches.map(coach => ({
      id: coach.id,
      name: coach.name,
      description: coach.description,
      status: coach.is_draft ? "Draft" : "Active",
      repsAssigned: 0,               // placeholder for now
      avgPerformance: "N/A",         // placeholder for now
      lastUpdated: new Date(coach.updated_at).toLocaleDateString(),
      image: coach.avatar_url || inboundSalesCoach,
    }));

  }


  // Fetch default home coach setting
  useEffect(() => {
    (async () => {
      try {
        const { data } = await ((supabase.from as any)('app_settings')
          .select('value')
          .eq('key', 'default_home_coach')
          .maybeSingle());
        if (data?.value) setDefaultCoach(data.value);
      } catch (e) {
        console.warn('Failed to fetch default coach', e);
      }
    })();
  }, []);

  // Listen for coach updates from other components
  useEffect(() => {
    const handleCoachUpdate = (event: CustomEvent) => {
      const { coachId, updatedData } = event.detail;
      setCoaches(prevCoaches => {
        const updatedCoaches = prevCoaches.map(coach =>
          coach.id === coachId
            ? { ...coach, ...updatedData, lastUpdated: "Just now" }
            : coach
        );
        localStorage.setItem('coaches', JSON.stringify(updatedCoaches));
        return updatedCoaches;
      });
    };

    window.addEventListener('coachUpdated', handleCoachUpdate as EventListener);
    return () => window.removeEventListener('coachUpdated', handleCoachUpdate as EventListener);
  }, []);

  // Update localStorage when coaches change
  useEffect(() => {
    localStorage.setItem('coaches', JSON.stringify(coaches));
  }, [coaches]);

  const filteredCoaches = coaches.filter(coach =>
    coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coach.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
            <Link to="/" className="flex items-center gap-1 hover:underline">
              <HomeIcon className="h-4 w-4" />
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium">Coach Management</span>
          </nav>
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Coach Management
              </h1>
              <p className="text-xl text-muted-foreground">
                Select a coach to edit or create a new company coach
              </p>
              {defaultCoach && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">Default for new users</Badge>
                  <span className="text-sm text-muted-foreground">{defaultCoach.name || defaultCoach.email}</span>
                </div>
              )}
            </div>
            <Link to="/company-coach">
              <Button size="lg" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Build New Coach
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search coaches by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Coaches Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCoaches.map((coach) => (
              <Card key={coach.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {coach.image ? (
                        <img
                          src={coach.image}
                          alt={coach.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{coach.name}</CardTitle>
                        <Badge
                          variant={coach.status === "Active" ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {coach.status}
                        </Badge>
                        {defaultCoach?.name && coach.name.toLowerCase() === defaultCoach.name.toLowerCase() && (
                          <Badge variant="secondary" className="mt-1 ml-2">Default for new users</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {coach.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{coach.repsAssigned} reps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>{coach.avgPerformance}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Updated {coach.lastUpdated}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link to={`/coach-training/${coach.id}?name=${encodeURIComponent(coach.name)}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Train Coach
                      </Button>
                    </Link>
                    <Link to={`/company-coach?edit=${coach.id}`} className="flex-1">
                      <Button variant="default" className="w-full">
                        Edit Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredCoaches.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No coaches found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Create your first company coach to get started"}
              </p>
              <Link to="/company-coach">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Build New Coach
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CoachManagement;