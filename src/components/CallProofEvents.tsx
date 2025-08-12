import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Calendar } from "lucide-react";
type Range = 'today' | 'week';

interface Props {
  userId: string | null;
  range: Range;
}

interface EventItem {
  id: string;
  userName: string;
  userAvatar?: string | null;
  action: string;
  target: string;
  ts: number; // epoch ms
  extra?: string;
  kind: 'email' | 'call' | 'meeting';
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function safeDate(value: any): number {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.getTime() : Date.now();
}

function IconFor({ kind }: { kind: 'email' | 'call' | 'meeting' }) {
  const className = "h-4 w-4 text-muted-foreground";
  switch (kind) {
    case 'email':
      return <Mail className={className} />;
    case 'call':
      return <Phone className={className} />;
    case 'meeting':
      return <Calendar className={className} />;
    default:
      return null;
  }
}

export default function CallProofEvents({ userId, range }: Props) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => (range === 'today' ? 1 : 7), [range]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("callproof-activity", {
          body: { userId, days, limit: 50 },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);

        const calls = (data as any)?.calls ?? [];
        const appts = (data as any)?.appointments ?? [];
        const emails = (data as any)?.emails ?? [];

        const toEvents: EventItem[] = [];

        for (const c of calls) {
          toEvents.push({
            id: `call_${c.id ?? Math.random().toString(36)}`,
            userName: c.user_name || c.user || c.employee || "User",
            userAvatar: c.user_avatar || null,
            action: (c.direction === 'outbound' ? 'made a call to' : c.direction === 'inbound' ? 'received a call from' : 'recorded a call with'),
            target: c.contact_name || c.account_name || c.company || c.name || 'unknown',
            ts: safeDate(c.created_at || c.timestamp || c.time || c.date),
            extra: c.duration ? `for ${c.duration}` : undefined,
            kind: 'call',
          });
        }

        for (const e of emails) {
          toEvents.push({
            id: `email_${e.id ?? Math.random().toString(36)}`,
            userName: e.user_name || e.user || e.employee || "User",
            userAvatar: e.user_avatar || null,
            action: (e.direction === 'outbound' ? 'emailed' : 'received an email from'),
            target: e.contact_name || e.account_name || e.company || e.name || 'unknown',
            ts: safeDate(e.created_at || e.timestamp || e.time || e.date),
            extra: e.subject ? `“${e.subject}”` : undefined,
            kind: 'email',
          });
        }

        for (const a of appts) {
          toEvents.push({
            id: `appt_${a.id ?? Math.random().toString(36)}`,
            userName: a.user_name || a.user || a.employee || "User",
            userAvatar: a.user_avatar || null,
            action: 'scheduled a meeting with',
            target: a.contact_name || a.account_name || a.company || a.name || 'unknown',
            ts: safeDate(a.created_at || a.timestamp || a.time || a.date),
            extra: a.location ? `at ${a.location}` : undefined,
            kind: 'meeting',
          });
        }

        toEvents.sort((a, b) => b.ts - a.ts);
        setEvents(toEvents);
      } catch (err: any) {
        setError(err?.message || 'Failed to load activity');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, days]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Sign in to view recent activity.</p>;
  }

  return (
    <ScrollArea className="h-[300px]">
      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <div className="text-sm text-muted-foreground">
          {error.includes('Profile not found') ? (
            <p>Connect CallProof in Profile Settings to see recent activity.</p>
          ) : (
            <p>{error}</p>
          )}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="divide-y">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 py-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ev.userAvatar ?? undefined} alt={ev.userName} />
                <AvatarFallback>{ev.userName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm flex items-center gap-2">
                  <IconFor kind={ev.kind} />
                  <span>
                    <span className="font-medium text-primary hover:underline cursor-pointer">{ev.userName}</span> {ev.action}{" "}
                    <span className="font-medium text-primary hover:underline cursor-pointer">{ev.target}</span>
                  </span>
                </p>
                {ev.extra && (
                  <div className="mt-1 bg-muted rounded px-2 py-1 text-xs text-muted-foreground truncate">
                    {ev.extra}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(ev.ts)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ScrollArea>
  );
}
