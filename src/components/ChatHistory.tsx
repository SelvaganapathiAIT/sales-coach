import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { 
  Clock, 
  MessageSquare, 
  Calendar, 
  User, 
  Target, 
  TrendingUp,
  ChevronRight,
  Play,
  History,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { sessionManager } from "@/utils/sessionManager";

interface ChatHistoryProps {
  onSessionSelect?: (sessionId: string) => void;
  onResumeSession?: (sessionId: string) => void;
  onNewSession?: () => void;
  currentSessionId?: string | null;
  onLoadSessionMessages?: (sessionId: string) => void;
}

interface SessionWithMessageCount extends Tables<"conversation_sessions"> {
  message_count: number;
  last_message?: string;
  last_message_time?: string;
}

export default function ChatHistory({ 
  onSessionSelect, 
  onResumeSession, 
  onNewSession,
  currentSessionId,
  onLoadSessionMessages
}: ChatHistoryProps) {
  const [sessions, setSessions] = useState<SessionWithMessageCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<SessionWithMessageCount | null>(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get sessions with message count (excluding soft-deleted sessions)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select(`
          *,
          conversation_messages (
            content,
            timestamp
          )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('started_at', { ascending: false });

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError);
        return;
      }

      // Process sessions to include message count and last message (excluding soft-deleted messages)
      const processedSessions: SessionWithMessageCount[] = sessionsData.map(session => {
        const messages = session.conversation_messages as Tables<"conversation_messages">[];
        // Filter out soft-deleted messages if the deleted_at column exists
        const activeMessages = messages.filter(msg => !(msg as any).deleted_at);
        const sortedMessages = activeMessages.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        return {
          ...session,
          message_count: activeMessages.length,
          last_message: sortedMessages[0]?.content?.substring(0, 100) + (sortedMessages[0]?.content?.length > 100 ? '...' : ''),
          last_message_time: sortedMessages[0]?.timestamp
        };
      });

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setSelectedSession(sessionId);
      
      // Call the parent callback to load messages in main chat area
      if (onLoadSessionMessages) {
        onLoadSessionMessages(sessionId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCoachInitials = (personality: string) => {
    const words = personality.split(' ');
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'AI';
  };

  const handleRenameSession = async (session: SessionWithMessageCount) => {
    setSessionToRename(session);
    setNewSessionTitle(session.session_title || 'Sales Coaching Session');
    setRenameDialogOpen(true);
  };

  const confirmRenameSession = async () => {
    if (!sessionToRename || !newSessionTitle.trim()) return;

    try {
      setIsRenaming(true);
      const { error } = await supabase
        .from('conversation_sessions')
        .update({ session_title: newSessionTitle.trim() })
        .eq('id', sessionToRename.id);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(s => 
        s.id === sessionToRename.id 
          ? { ...s, session_title: newSessionTitle.trim() }
          : s
      ));

      setRenameDialogOpen(false);
      setSessionToRename(null);
      setNewSessionTitle("");
    } catch (error) {
      console.error('Error renaming session:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      console.log(`Deleting session: ${sessionId}`);
      
      // Use sessionManager to handle deletion with fallback
      const success = await sessionManager.deleteSession(sessionId);

      if (success) {
        console.log(`Successfully deleted session: ${sessionId}`);
        
        // Remove from local state
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // If this was the current session, clear it
        if (currentSessionId === sessionId) {
          if (onLoadSessionMessages) {
            onLoadSessionMessages('');
          }
        }
        
        // Show success message briefly
        setDeleteError('Session deleted successfully!');
        setTimeout(() => {
          setDeleteError(null);
        }, 3000);
      } else {
        throw new Error('Failed to delete session - please try again');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete session - please try again');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setDeleteError(null);
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearingHistory(true);
      setDeleteError(null);
      
      console.log('Clearing all chat history...');
      
      // Get all session IDs for the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userSessions } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (userSessions && userSessions.length > 0) {
        const sessionIds = userSessions.map(s => s.id);
        console.log(`Found ${sessionIds.length} sessions to delete`);
        
        // Delete each session using sessionManager
        let allDeleted = true;
        let deletedCount = 0;
        
        for (const sessionId of sessionIds) {
          const success = await sessionManager.deleteSession(sessionId);
          if (success) {
            deletedCount++;
          } else {
            allDeleted = false;
            console.error(`Failed to delete session: ${sessionId}`);
          }
        }

        if (allDeleted) {
          console.log(`Successfully deleted all ${deletedCount} sessions`);
          // Clear local state
          setSessions([]);
          
          // Clear current session
          if (onLoadSessionMessages) {
            onLoadSessionMessages('');
          }
          
          // Show success message briefly
          setDeleteError(`Successfully cleared ${deletedCount} sessions!`);
          setTimeout(() => {
            setDeleteError(null);
          }, 3000);
        } else {
          throw new Error(`Failed to delete ${sessionIds.length - deletedCount} sessions`);
        }
      } else {
        console.log('No sessions found to delete');
        setSessions([]);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to clear chat history - please try again');
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setDeleteError(null);
      }, 5000);
    } finally {
      setIsClearingHistory(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-800/90 dark:to-slate-900/80 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading sessions...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 p-3 h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-300/40 dark:border-blue-600/40">
            <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Chat History
            </h3>
            <p className="text-xs text-muted-foreground">Your sessions</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          {onNewSession && (
            <Button
              variant="default"
              size="sm"
              onClick={onNewSession}
              className="flex items-center space-x-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg h-7 px-2"
            >
              <Play className="h-3 w-3" />
              <span className="text-xs font-medium">New</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            className="flex items-center space-x-1 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 h-7 w-7 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          {sessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChatHistory}
              disabled={isClearingHistory}
              className="flex items-center space-x-1 text-destructive hover:text-destructive border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Error/Success Message */}
      {deleteError && (
        <Card className={`p-3 border ${
          deleteError.includes('Successfully') || deleteError.includes('deleted') 
            ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
        }`}>
          <div className={`flex items-center space-x-2 ${
            deleteError.includes('Successfully') || deleteError.includes('deleted')
              ? 'text-green-700 dark:text-green-400'
              : 'text-red-700 dark:text-red-400'
          }`}>
            {deleteError.includes('Successfully') || deleteError.includes('deleted') ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{deleteError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteError(null)}
              className={`ml-auto h-6 w-6 p-0 ${
                deleteError.includes('Successfully') || deleteError.includes('deleted')
                  ? 'text-green-600 hover:text-green-700'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              ×
            </Button>
          </div>
        </Card>
      )}

      {sessions.length === 0 ? (
        <Card className="p-8 text-center bg-gradient-to-br from-white/90 to-slate-50/80 dark:from-slate-800/90 dark:to-slate-900/80 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm">
          <div className="p-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">No conversations yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Start a conversation with your AI coach to see your chat history here.
          </p>
        </Card>
      ) : (
        <>
          {/* Compact Session Statistics */}
          <Card className="p-3 mb-3 bg-gradient-to-br from-white/95 to-slate-50/90 dark:from-slate-800/95 dark:to-slate-900/90 border border-slate-200/70 dark:border-slate-700/70 shadow-lg backdrop-blur-md">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/60 dark:to-blue-900/40 border border-blue-200/70 dark:border-blue-800/70">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{sessions.length}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-50/80 to-purple-100/60 dark:from-purple-950/60 dark:to-purple-900/40 border border-purple-200/70 dark:border-purple-800/70">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {sessions.reduce((total, s) => total + s.message_count, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
            </div>
          </Card>
          
          {/* Compact Recent Sessions */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Recent Sessions</h4>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-600"></div>
            </div>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`p-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] group ${
                      selectedSession === session.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                    } ${currentSessionId === session.id ? 'bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/50 dark:to-indigo-950/40 border-blue-300/70 dark:border-blue-700/70 shadow-lg' : 'bg-gradient-to-br from-white/95 to-slate-50/90 dark:from-slate-800/95 dark:to-slate-900/90 border-slate-200/70 dark:border-slate-700/70'} shadow-md backdrop-blur-md hover:from-blue-50/80 hover:to-indigo-50/60 dark:hover:from-blue-950/40 dark:hover:to-indigo-950/30`}
                    onClick={() => loadSessionMessages(session.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 border border-white dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform duration-300">
                          <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            {getCoachInitials(session.coach_personality)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 mb-1">
                            <h5 className="text-xs font-bold truncate text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                              {session.session_title || 'Sales Coaching Session'}
                            </h5>
                            {currentSessionId === session.id && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-green-300 dark:border-green-700 animate-pulse px-1 py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>{formatDate(session.started_at)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>{session.message_count}</span>
                            </div>
                          </div>
                          {(session.message_count > 0 && session.last_message) && (
                            <p className="text-xs text-muted-foreground truncate bg-slate-50/80 dark:bg-slate-800/60 rounded px-2 py-1 border border-slate-200/50 dark:border-slate-700/50 group-hover:bg-blue-50/80 dark:group-hover:bg-blue-950/30 transition-colors duration-300">
                              {session.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors group-hover:translate-x-0.5 duration-300" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-110 transition-all duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRenameSession(session);
                              }}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            >
                              <Edit className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium">Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              className="flex items-center space-x-2 text-destructive focus:text-destructive cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/50"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="text-xs font-medium">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Enhanced Rename Session Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5 text-blue-600" />
              <span>Rename Session</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="session-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Session Title
              </label>
              <Input
                id="session-title"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Enter session title..."
                className="mt-1 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    confirmRenameSession();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameDialogOpen(false);
                  setSessionToRename(null);
                  setNewSessionTitle("");
                }}
                className="border-slate-300 dark:border-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRenameSession}
                disabled={!newSessionTitle.trim() || isRenaming}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                {isRenaming ? 'Renaming...' : 'Rename'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
