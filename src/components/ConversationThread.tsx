import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ConversationMessage {
  id: string;
  sent_at: string;
  recipient_email: string;
  subject: string;
  message: string;
  coach_email: string;
}

interface ConversationThreadProps {
  messages: ConversationMessage[];
  coachEmail: string;
  onSendComment: (msg: ConversationMessage, text: string) => Promise<void> | void;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  messages,
  coachEmail,
  onSendComment,
}) => {
  const ordered = useMemo(() => {
    return [...(messages || [])].sort(
      (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    );
  }, [messages]);

  const [commentById, setCommentById] = useState<Record<string, string>>({});
  const [sendingFor, setSendingFor] = useState<string | null>(null);

  const handleSend = async (m: ConversationMessage) => {
    const text = (commentById[m.id] || "").trim();
    if (!text) return;
    try {
      setSendingFor(m.id);
      await onSendComment(m, text);
      setCommentById((s) => ({ ...s, [m.id]: "" }));
    } finally {
      setSendingFor(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((m) => {
        const outgoing = m.recipient_email === coachEmail; // to coach => from user (right)
        return (
          <div key={m.id} className={cn("flex", outgoing ? "justify-end" : "justify-start")}> 
            <div className="max-w-[82%]">
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 shadow-sm",
                  outgoing
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                )}
              >
                {m.subject && (
                  <div className={cn("text-xs font-medium", outgoing ? "opacity-90" : "text-muted-foreground")}> 
                    {m.subject}
                  </div>
                )}
                <div className="text-sm whitespace-pre-line mt-0.5">{m.message}</div>
                <div className={cn("mt-1 text-[10px]", outgoing ? "opacity-80" : "text-muted-foreground")}> 
                  {new Date(m.sent_at).toLocaleString()}
                </div>
              </div>

              {/* Comment box */}
              <div className={cn("mt-2", outgoing ? "pl-8" : "pr-8")}> 
                <div className="flex items-start gap-2">
                  <Textarea
                    placeholder="Add a comment about this message..."
                    value={commentById[m.id] || ""}
                    onChange={(e) =>
                      setCommentById((s) => ({ ...s, [m.id]: e.target.value }))
                    }
                    className="min-h-[56px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!commentById[m.id]?.trim() || sendingFor === m.id}
                    onClick={() => handleSend(m)}
                  >
                    {sendingFor === m.id ? "Sending..." : "Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
