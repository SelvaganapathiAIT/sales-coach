import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  ts: number;
}

const CoachChatDock: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when messages update
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-agent", {
        body: {
          message: trimmed,
          userId,
        },
      });
      if (error) throw error;

      const reply = (data as any)?.response || "Thanks! I’m here to help.";
      const coachMsg: ChatMessage = { id: crypto.randomUUID(), role: "coach", text: reply, ts: Date.now() };
      setMessages((prev) => [...prev, coachMsg]);
    } catch (e: any) {
      console.error("Coach chat error", e);
      toast({ title: "Coach unavailable", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button variant="premium" size="lg" onClick={() => setOpen(true)} aria-label="Open Coach Chat">
          Coach Chat
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>AI Coach</SheetTitle>
          </SheetHeader>
          <div className="px-6 pt-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="inbox">Inbox</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <div className="flex flex-col h-[70vh]">
                  <ScrollArea ref={listRef} className="flex-1 border rounded-md p-4">
                    <div className="space-y-4">
                      {messages.length === 0 && (
                        <p className="text-sm text-muted-foreground">Start a conversation with your AI sales coach.</p>
                      )}
                      {messages.map((m) => (
                        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[80%] rounded-md px-3 py-2 text-sm",
                              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Type a message"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                    />
                    <Button onClick={sendMessage} disabled={sending}>
                      {sending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inbox" className="mt-4">
                <div className="h-[70vh] border rounded-md p-4">
                  <p className="text-sm text-muted-foreground">No new messages. Notifications from your coach will appear here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CoachChatDock;
