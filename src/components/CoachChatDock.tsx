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
  const renderFormattedContent = (text: string) => {
    const lines = text.split("\n");

    let currentList: JSX.Element[] = [];
    let listType: "ul" | null = null;
    const rendered: JSX.Element[] = [];

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        rendered.push(
          <ul key={`ul-${rendered.length}`} className="ml-3 mb-3 space-y-1">
            {currentList}
          </ul>
        );
        currentList = [];
        listType = null;
      }
    };

    const formatInline = (line: string) => {
      const parseLinksAndImages = (text: string): (string | JSX.Element)[] => {
        const elements: (string | JSX.Element)[] = [];
        const regex = /(!)?\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            elements.push(text.slice(lastIndex, match.index));
          }
          const isImage = !!match[1];
          const altOrText = match[2] || (isImage ? 'View image' : 'link');
          const url = match[3];
          if (isImage) {
            elements.push(
              <a
                key={`img-${elements.length}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block my-2"
              >
                <img
                  src={url}
                  alt={altOrText || 'Image'}
                  className="h-24 w-24 rounded-full object-cover border shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.replaceWith(
                        Object.assign(document.createElement('a'), {
                          href: url,
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          textContent: altOrText || url,
                          className: 'underline text-blue-600 hover:text-blue-700',
                        })
                      );
                    }
                  }}
                />
              </a>
            );
          } else {
            elements.push(
              <a
                key={`link-${elements.length}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-700"
              >
                {altOrText || url}
              </a>
            );
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          elements.push(text.slice(lastIndex));
        }
        return elements;
      };

      const parts = parseLinksAndImages(line);

      const applyEmphasis = (segment: string, keyPrefix: string) => {
        if (/\*\*\*.*?\*\*\*/.test(segment)) {
          return segment.split(/(\*\*\*.*?\*\*\*)/g).map((part, i) =>
            part.startsWith("***") && part.endsWith("***") ? (
              <em key={`${keyPrefix}-b+i-${i}`}>
                <strong>{part.slice(3, -3)}</strong>
              </em>
            ) : (
              part
            )
          );
        }

        if (/\*\*.*?\*\*/.test(segment)) {
          return segment.split(/(\*\*.*?\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>
            ) : (
              part
            )
          );
        }

        if (/\*.*?\*/.test(segment)) {
          return segment.split(/(\*.*?\*)/g).map((part, i) =>
            part.startsWith("*") && part.endsWith("*") ? (
              <em key={`${keyPrefix}-i-${i}`}>{part.slice(1, -1)}</em>
            ) : (
              part
            )
          );
        }

        return segment;
      };

      const nodes: (string | JSX.Element)[] = [];
      parts.forEach((part, idx) => {
        if (typeof part === 'string') {
          const emphasized = applyEmphasis(part, `seg-${idx}`);
          if (Array.isArray(emphasized)) nodes.push(...emphasized);
          else nodes.push(emphasized);
        } else {
          nodes.push(part);
        }
      });

      return nodes as any;
    };

    const normalizedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const current = lines[i];
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      const labelMatch = current.trim().match(/(!)?\[[^\]]+\]\s*$/);
      const urlMatch = next.trim().match(/^\((https?:\/\/[^)]+)\)$/);
      if (labelMatch && urlMatch) {
        normalizedLines.push(`${current.trim()}(${urlMatch[1]})`);
        i++;
      } else {
        normalizedLines.push(current);
      }
    }

    normalizedLines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed === "") {
        flushList();
        rendered.push(<div key={`br-${index}`} className="mb-3" />);
        return;
      }

      const sectionMatch = trimmed.match(/^([A-Z][A-Za-z ]+):$/);
      if (sectionMatch) {
        flushList();
        rendered.push(
          <h3 key={`section-${index}`} className="font-semibold text-lg mb-2 text-primary">
            {sectionMatch[1]}
          </h3>
        );
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const Tag = `h${Math.min(level, 3)}` as keyof JSX.IntrinsicElements;
        rendered.push(
          <Tag key={`h-${index}`} className="font-semibold text-lg mb-2 text-primary">
            {text}
          </Tag>
        );
        return;
      }

      const listMatch = trimmed.match(/^(?:\d+\.|[-•])\s+(.*)$/);
      if (listMatch) {
        if (listType !== "ul") flushList();
        listType = "ul";
        currentList.push(
          <li key={`ul-item-${index}`} className="flex items-start">
            <span className="mr-2">➡️</span>
            <span>{formatInline(listMatch[1])}</span>
          </li>
        );
        return;
      }

      flushList();
      rendered.push(
        <p key={`p-${index}`} className="mb-2 text-sm leading-relaxed">
          {formatInline(trimmed)}
        </p>
      );
    });

    flushList();
    return rendered;
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
                            {renderFormattedContent(m.text)}
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
