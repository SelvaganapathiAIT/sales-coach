import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CoachChatDock from "@/components/CoachChatDock";
import CallProofEvents from "@/components/CallProofEvents";

import { Pencil, Check, X, HomeIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";

interface MetricState {
  callsToday: number | null;
  appointmentsToday: number | null;
}

const SalesDesk: React.FC = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<MetricState>({ callsToday: null, appointmentsToday: null });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const [followups, setFollowups] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [displayPipeline, setDisplayPipeline] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState<string>("");
  const [completedFollowups, setCompletedFollowups] = useState<Set<string>>(new Set());
  const [closedMtd, setClosedMtd] = useState<number | null>(52000);
  const [mtdGoal, setMtdGoal] = useState<number | null>(100000);

  // Load persisted values
  useEffect(() => {
    try {
      const storedClosed = localStorage.getItem("salesdesk_closed_mtd");
      const storedGoal = localStorage.getItem("salesdesk_mtd_goal");
      if (storedClosed) setClosedMtd(parseFloat(storedClosed));
      if (storedGoal) setMtdGoal(parseFloat(storedGoal));
    } catch {}
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      if (closedMtd != null) localStorage.setItem("salesdesk_closed_mtd", String(closedMtd));
      if (mtdGoal != null) localStorage.setItem("salesdesk_mtd_goal", String(mtdGoal));
    } catch {}
  }, [closedMtd, mtdGoal]);

  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState("");

  const saveGoal = () => {
    const amt = parseFloat(tempGoal);
    if (!isNaN(amt) && amt > 0) {
      setMtdGoal(amt);
      setEditingGoal(false);
      setTempGoal("");
      toast({ title: "Goal updated", description: `MTD Goal set to $${amt.toLocaleString()}.` });
    } else {
      toast({ title: "Enter a valid goal", variant: "destructive" });
    }
  };

  const cancelGoal = () => {
    setEditingGoal(false);
    setTempGoal("");
  };

  const [editingClosed, setEditingClosed] = useState(false);
  const [tempClosed, setTempClosed] = useState("");

  const saveClosed = () => {
    const amt = parseFloat(tempClosed);
    if (!isNaN(amt) && amt >= 0) {
      setClosedMtd(amt);
      setEditingClosed(false);
      setTempClosed("");
      toast({ title: "Closed MTD updated", description: `$${amt.toLocaleString()} recorded as Closed MTD.` });
    } else {
      toast({ title: "Enter a valid amount", variant: "destructive" });
    }
  };

  const cancelClosed = () => {
    setEditingClosed(false);
    setTempClosed("");
  };

  const samplePipeline = useMemo(
    () => [
      { name: "Acme Corp - Renewal", company: "Acme Corp", stage: "Negotiation", amount: 25000 },
      { name: "Globex Onboarding", company: "Globex", stage: "Discovery", amount: 12000 },
      { name: "Soylent Manufacturing", company: "Soylent", stage: "Proposal", amount: 18000 },
      { name: "Initech - Expansion", company: "Initech", stage: "Qualified", amount: 32000 },
    ],
    []
  );

  const sampleFollowups = useMemo(
    () => [
      { title: "Call back Joe White re: next meeting", dueDate: "Today 3:00 PM", priority: "high" },
      { title: "Email Sarah Lee the proposal", dueDate: "Tomorrow 10:00 AM", priority: "medium" },
      { title: "Follow up with Acme Inc. on renewal", dueDate: "Fri 2:00 PM", priority: "low" },
    ],
    []
  );

  // Keep an editable local copy of pipeline
  useEffect(() => {
    setDisplayPipeline(pipeline && pipeline.length > 0 ? pipeline : samplePipeline);
  }, [pipeline, samplePipeline]);

  const [searchTab, setSearchTab] = useState<"contacts" | "companies">("contacts");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [range, setRange] = useState<'today' | 'week'>('today');

  type InlineChatMessage = { id: string; role: "user" | "coach"; text: string; ts: number };
  const [chatMessages, setChatMessages] = useState<InlineChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id ?? null;
      setUserId(id);
      setSelectedUserId(id);
    });
  }, []);

  const canonical = useMemo(() => {
    return typeof window !== "undefined" ? window.location.href : "https://salescoaches.ai/sales-desk";
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selectedUserId) return;
      setLoadingMetrics(true);
      try {
        const days = range === 'today' ? 1 : 7;
        const { data, error } = await supabase.functions.invoke("callproof-activity", {
          body: { userId: selectedUserId, days },
        });
        if (error) throw error;
        const calls = (data as any)?.calls ?? [];
        const appointments = (data as any)?.appointments ?? [];
        setMetrics({
          callsToday: Array.isArray(calls) ? calls.length : null,
          appointmentsToday: Array.isArray(appointments) ? appointments.length : null,
        });
        // Placeholders until CallProof endpoints are available
        setFollowups((data as any)?.followups ?? []);
        setPipeline((data as any)?.pipeline ?? []);
      } catch (e) {
        console.warn("SalesDesk: Failed to fetch CallProof metrics", e);
      } finally {
        setLoadingMetrics(false);
      }
    };
    fetchMetrics();
  }, [selectedUserId, range]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({ title: "Enter a search term", description: "Type a name or company to search in CallProof" });
      return;
    }
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("crm-account-query", {
        body: {
          searchTerm,
          query: "search",
          userId,
          searchType: searchTab === "contacts" ? "contact" : "account",
        },
      });
      if (error) throw error;
      setSearchResults(data);
    } catch (e: any) {
      console.error("SalesDesk search error", e);
      toast({
        title: "Search failed",
        description: e?.message ?? "Couldn't query the CRM right now.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const sendInlineChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const userMsg: InlineChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed, ts: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat-with-agent", {
        body: { message: trimmed, userId },
      });
      if (error) throw error;
      const reply = (data as any)?.response || "Thanks! I’m here to help.";
      const coachMsg: InlineChatMessage = { id: crypto.randomUUID(), role: "coach", text: reply, ts: Date.now() };
      setChatMessages((prev) => [...prev, coachMsg]);
    } catch (e) {
      console.error("Inline coach chat error", e);
      toast({ title: "Coach unavailable", description: "Please try again.", variant: "destructive" });
    } finally {
      setChatSending(false);
    }
  };

  const onChatKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendInlineChat();
    }
  };

  return (
    <>
    <AuthLayout>
      <Helmet>
        <title>Sales Desk | SalesCoaches.ai</title>
        <meta
          name="description"
          content="Sales Desk for CallProof: follow-ups, pipeline, search, and today's calls and appointments."
        />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index,follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Sales Desk",
            description:
              "Sales Desk for CallProof: follow-ups, pipeline, search, and today's calls and appointments.",
            url: canonical,
          })}
        </script>
      </Helmet>

      <main className="container mx-auto px-4 py-8">
        <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
              <Link to="/" className="flex items-center gap-1 hover:underline">
                <HomeIcon className="h-4 w-4" /> Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground font-medium">
                Sales Desk
              </span>
            </nav>
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Sales Desk</h1>
          <p className="text-muted-foreground mt-1">CallProof CRM overview and daily workflow</p>
        </header>

        {/* Controls */}
        <section aria-label="filters" className="mb-6 grid gap-3 md:grid-cols-3 md:items-start">
          <div className="flex items-center gap-3">
            <div className="min-w-[220px]">
              <Select value={selectedUserId ?? ''} onValueChange={(v) => setSelectedUserId(v)}>
                <SelectTrigger aria-label="Team member">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {userId && <SelectItem value={userId}>Me</SelectItem>}
                  <SelectItem value="all" disabled>All Team (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v as any)}>
                <ToggleGroupItem value="today" aria-label="Today">Today</ToggleGroupItem>
                <ToggleGroupItem value="week" aria-label="This Week">This Week</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Closed MTD & Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-end gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Closed MTD</span>
                    {editingClosed ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={tempClosed}
                        onChange={(e) => setTempClosed(e.target.value)}
                        onBlur={saveClosed}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveClosed(); if (e.key === 'Escape') cancelClosed(); }}
                        aria-label="Edit Closed MTD"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-2xl font-semibold underline-offset-4 hover:underline"
                        onClick={() => { setEditingClosed(true); setTempClosed(closedMtd != null ? String(closedMtd) : ""); }}
                        aria-label="Edit Closed MTD"
                      >
                        {closedMtd != null ? `$${closedMtd.toLocaleString()}` : 'Set amount'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Goal</span>
                    {editingGoal ? (
                      <Input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={tempGoal}
                        onChange={(e) => setTempGoal(e.target.value)}
                        onBlur={saveGoal}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') cancelGoal(); }}
                        aria-label="Edit MTD goal"
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-2xl font-semibold underline-offset-4 hover:underline"
                        onClick={() => { setEditingGoal(true); setTempGoal(mtdGoal != null ? String(mtdGoal) : ""); }}
                        aria-label="Edit MTD goal"
                      >
                        {mtdGoal != null ? `$${mtdGoal.toLocaleString()}` : 'Set goal'}
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            <Tabs value={searchTab} onValueChange={(v) => setSearchTab(v as any)}>
              <TabsList>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
                <TabsTrigger value="companies">Companies</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Input
                placeholder={searchTab === "contacts" ? "Search contacts by name" : "Search companies by name"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </section>


        {/* Overview Metrics */}
        <section aria-labelledby="overview" className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold">
                  {loadingMetrics ? 12 : (metrics.callsToday ?? 12)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Week: {loadingMetrics ? 63 : (metrics.callsToday != null ? metrics.callsToday * 5 + 3 : 63)} • MTD: {loadingMetrics ? 248 : (metrics.callsToday != null ? metrics.callsToday * 20 + 10 : 248)}
                </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Appointments Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-semibold">
                  {loadingMetrics ? 3 : (metrics.appointmentsToday ?? 3)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Week: {loadingMetrics ? 11 : (metrics.appointmentsToday != null ? metrics.appointmentsToday * 3 + 1 : 11)} • MTD: {loadingMetrics ? 42 : (metrics.appointmentsToday != null ? metrics.appointmentsToday * 12 + 4 : 42)}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Follow-ups */}
          <article>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Follow-ups</CardTitle>
                <Badge variant="secondary">Due: {(followups && followups.length > 0 ? followups.length : sampleFollowups.length)}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">Total due: {(followups && followups.length > 0 ? followups.length : sampleFollowups.length)}</p>
                <ScrollArea className="h-[300px]">
                  <ul className="space-y-3">
                    {(followups && followups.length > 0 ? followups : sampleFollowups).map((f: any, idx: number) => {
                      const key = `${f?.id ?? ''}|${f?.title ?? f?.name ?? ''}|${f?.dueDate ?? f?.due_date ?? ''}`;
                      const isCompleted = completedFollowups.has(key);
                      return (
                        <li key={idx} className={`flex items-center justify-between ${isCompleted ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(checked) => {
                                setCompletedFollowups(prev => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(key);
                                    toast({ title: "Follow-up completed", description: f?.title ?? f?.name ?? "Follow-up" });
                                  } else {
                                    next.delete(key);
                                  }
                                  return next;
                                });
                              }}
                              aria-label="Mark follow-up complete"
                            />
                            <div>
                              <p className={`font-medium ${isCompleted ? "line-through" : ""}`}>
                                {f?.title ?? f?.name ?? "Follow-up"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Due {f?.dueDate || f?.due_date || "—"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">{f?.priority || "due"}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </article>

          {/* Pipeline */}
          <article>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pipeline</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({ title: "Edit Pipeline", description: "Pipeline editing coming soon." })
                  }
                  aria-label="Edit pipeline"
                >
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Total: ${displayPipeline.reduce((sum, d) => sum + (d?.amount ?? 0), 0).toLocaleString()} ({displayPipeline.length} deals)
                </p>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {displayPipeline.map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between border rounded-md p-3">
                          <div className="min-w-0">
                          <p className="font-medium truncate">{d?.name || d?.title || "Deal"}</p>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {editingIndex === idx ? (
                              <>
                                <Input
                                  value={editCompany}
                                  onChange={(e) => setEditCompany(e.target.value)}
                                  className="h-8"
                                  aria-label="Edit company"
                                />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setDisplayPipeline(prev => {
                                      const next = [...prev];
                                      if (next[idx]) next[idx] = { ...next[idx], company: editCompany };
                                      return next;
                                    });
                                    setEditingIndex(null);
                                    setEditCompany("");
                                  }}
                                  aria-label="Save company"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingIndex(null); setEditCompany(""); }}
                                  aria-label="Cancel edit"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span>{d?.company || d?.account || "—"}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingIndex(idx); setEditCompany(d?.company || d?.account || ""); }}
                                  aria-label="Edit company"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{d?.stage || "Stage"}</p>
                          <p className="font-semibold">{d?.amount ? `$${d.amount}` : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </article>
        </section>

        {/* Search Results */}

        {/* Call Reviews + Coach Chat Row */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Call Reviews */}
          <article>
            <Card>
              <CardHeader>
                <CardTitle>Call Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <ul className="space-y-3">
                    <li className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Joe White</p>
                        <Badge variant="secondary">positive</Badge>
                      </div>
                      <p className="text-sm mt-1">Good call, but I didn't hear you work to book another meeting.</p>
                      <p className="text-xs text-muted-foreground mt-2">Next time: Ask for a concrete next step and propose two time options.</p>
                    </li>
                    <li className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Sarah Lee</p>
                        <Badge variant="secondary">coaching</Badge>
                      </div>
                      <p className="text-sm mt-1">Strong discovery. You skipped budget/timeline qualification.</p>
                      <p className="text-xs text-muted-foreground mt-2">Next time: Confirm buying process and lock a next step with a calendar invite.</p>
                    </li>
                    <li className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Acme Inc.</p>
                        <Badge variant="secondary">neutral</Badge>
                      </div>
                      <p className="text-sm mt-1">Pitch was feature-heavy. Lead with outcomes and proof.</p>
                      <p className="text-xs text-muted-foreground mt-2">Next time: Use a relevant case study and end with a clear CTA to schedule a demo.</p>
                    </li>
                  </ul>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-3">Sample feedback shown. This will be replaced by CallProof reviews.</p>
              </CardContent>
            </Card>
          </article>

          {/* Recent Events (CallProof) */}
          <article>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <CallProofEvents userId={selectedUserId} range={range} />
              </CardContent>
            </Card>
          </article>
        </section>
      </main>

      <CoachChatDock />
      </AuthLayout>
    </>
  );
};

export default SalesDesk;
