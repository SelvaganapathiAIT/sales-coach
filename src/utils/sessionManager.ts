import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export interface SessionManager {
  createSession: (coachPersonality: string, sessionTitle?: string) => Promise<string | null>;
  endSession: (sessionId: string, summary?: string, keyOutcomes?: string[]) => Promise<void>;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string, messageType?: 'text' | 'audio' | 'system', metadata?: Record<string, any>) => Promise<void>;
  updateSessionSummary: (sessionId: string, summary: string, keyOutcomes?: string[]) => Promise<void>;
  getSessionMessages: (sessionId: string) => Promise<Tables<"conversation_messages">[]>;
  getCurrentSession: () => string | null;
  setCurrentSession: (sessionId: string | null) => void;
  softDeleteSession: (sessionId: string) => Promise<boolean>;
  hardDeleteSession: (sessionId: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;
}

class SessionManagerImpl implements SessionManager {
  private currentSessionId: string | null = null;

  async createSession(coachPersonality: string, sessionTitle?: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return null;
      }

      const { data: session, error } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: user.id,
          coach_personality: coachPersonality,
          session_title: sessionTitle || 'Sales Coaching Session',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return null;
      }

      this.currentSessionId = session.id;
      localStorage.setItem('currentSessionId', session.id);
      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  async endSession(sessionId: string, summary?: string, keyOutcomes?: string[]): Promise<void> {
    try {
      const endedAt = new Date();
      const session = await this.getSession(sessionId);
      
      if (!session) {
        console.error('Session not found:', sessionId);
        return;
      }

      const startedAt = new Date(session.started_at);
      const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));

      const updateData: Partial<Tables<"conversation_sessions">> = {
        ended_at: endedAt.toISOString(),
        duration_minutes: durationMinutes
      };

      if (summary) {
        updateData.session_summary = summary;
      }

      if (keyOutcomes) {
        updateData.key_outcomes = keyOutcomes;
      }

      const { error } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
      } else {
        // Clear current session if it's the one being ended
        if (this.currentSessionId === sessionId) {
          this.currentSessionId = null;
          localStorage.removeItem('currentSessionId');
        }
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async addMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    messageType: 'text' | 'audio' | 'system' = 'text',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          message_type: messageType,
          metadata,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding message:', error);
      }
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }

  async updateSessionSummary(sessionId: string, summary: string, keyOutcomes?: string[]): Promise<void> {
    try {
      const updateData: Partial<Tables<"conversation_sessions">> = {
        session_summary: summary
      };

      if (keyOutcomes) {
        updateData.key_outcomes = keyOutcomes;
      }

      const { error } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating session summary:', error);
      }
    } catch (error) {
      console.error('Error updating session summary:', error);
    }
  }

  async getSessionMessages(sessionId: string): Promise<Tables<"conversation_messages">[]> {
    try {
      // Return empty array if sessionId is empty or invalid
      if (!sessionId || sessionId.trim() === '') {
        return [];
      }

      const { data: messages, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .is('deleted_at', null) // Only get non-deleted messages
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error getting session messages:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      console.error('Error getting session messages:', error);
      return [];
    }
  }

  private async getSession(sessionId: string): Promise<Tables<"conversation_sessions"> | null> {
    try {
      // Return null if sessionId is empty or invalid
      if (!sessionId || sessionId.trim() === '') {
        return null;
      }

      const { data: session, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .is('deleted_at', null) // Only get non-deleted sessions
        .single();

      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  getCurrentSession(): string | null {
    if (!this.currentSessionId) {
      this.currentSessionId = localStorage.getItem('currentSessionId');
    }
    return this.currentSessionId;
  }

  setCurrentSession(sessionId: string | null): void {
    this.currentSessionId = sessionId;
    if (sessionId) {
      localStorage.setItem('currentSessionId', sessionId);
    } else {
      localStorage.removeItem('currentSessionId');
    }
  }

  // Helper method to ensure we have an active session
  async ensureActiveSession(coachPersonality: string): Promise<string> {
    let sessionId = this.getCurrentSession();
    
    if (!sessionId) {
      sessionId = await this.createSession(coachPersonality);
    }
    
    if (!sessionId) {
      throw new Error('Failed to create or retrieve session');
    }
    
    return sessionId;
  }

  // Helper method to load existing session messages
  async loadSessionMessages(sessionId: string): Promise<Tables<"conversation_messages">[]> {
    return this.getSessionMessages(sessionId);
  }

  // Helper method to check if session exists and is active
  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session ? !session.ended_at && !(session as any).deleted_at : false;
  }

  // Helper method to clean up old sessions (for debugging)
  async cleanupOldSessions(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all sessions for the user that are older than 24 hours and have no messages
      const { data: oldSessions, error } = await supabase
        .from('conversation_sessions')
        .select(`
          id,
          started_at,
          conversation_messages (id)
        `)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .is('deleted_at', null) // Only get non-deleted sessions
        .lt('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching old sessions:', error);
        return;
      }

      // End sessions that have no messages and are old
      for (const session of oldSessions || []) {
        const messages = session.conversation_messages as any[];
        if (messages.length === 0) {
          await this.endSession(session.id);
          console.log(`Cleaned up old session: ${session.id}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
    }
  }

  // Helper method to soft delete a session
  async softDeleteSession(sessionId: string): Promise<boolean> {
    try {
      console.log(`Attempting to soft delete session: ${sessionId}`);
      
      // First check if the session exists
      const { data: existingSession, error: checkError } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      if (checkError) {
        console.error('Error checking session existence:', checkError);
        return false;
      }

      if (!existingSession) {
        console.error('Session not found:', sessionId);
        return false;
      }

      // Try to perform soft delete with deleted_at column
      try {
        const { error } = await supabase
          .from('conversation_sessions')
          .update({ 
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) {
          // If the error is about deleted_at column not existing, fall back to hard delete
          if (error.message && error.message.includes('deleted_at')) {
            console.warn('deleted_at column not found, falling back to hard delete');
            return await this.hardDeleteSession(sessionId);
          }
          
          console.error('Error soft deleting session:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return false;
        }

        console.log(`Successfully soft deleted session: ${sessionId}`);
      } catch (updateError) {
        // If update fails due to column issues, fall back to hard delete
        console.warn('Soft delete failed, falling back to hard delete:', updateError);
        return await this.hardDeleteSession(sessionId);
      }

      // Clear current session if it's the one being deleted
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        localStorage.removeItem('currentSessionId');
      }

      return true;
    } catch (error) {
      console.error('Error soft deleting session:', error);
      return false;
    }
  }

  // Helper method to hard delete a session (fallback)
  async hardDeleteSession(sessionId: string): Promise<boolean> {
    try {
      // First delete all messages in the session
      const { error: messagesError } = await supabase
        .from('conversation_messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) {
        console.error('Error deleting session messages:', messagesError);
        return false;
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('conversation_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Error hard deleting session:', sessionError);
        return false;
      }

      // Clear current session if it's the one being deleted
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        localStorage.removeItem('currentSessionId');
      }

      return true;
    } catch (error) {
      console.error('Error hard deleting session:', error);
      return false;
    }
  }

  // Helper method to delete session with fallback
  async deleteSession(sessionId: string): Promise<boolean> {
    // Try soft delete first
    const softDeleteSuccess = await this.softDeleteSession(sessionId);
    
    if (softDeleteSuccess) {
      return true;
    }

    // If soft delete fails, try hard delete
    console.warn('Soft delete failed, attempting hard delete');
    return await this.hardDeleteSession(sessionId);
  }

  // Update conversation history with insights and topics
  async updateConversationHistory(
    agentId: string,
    summary?: string,
    keyInsights?: string[],
    lastTopics?: string[],
    userInfo?: {
      name?: string;
      company?: string;
      goals?: string;
      challenges?: string;
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        agent_id: agentId,
        user_id: user.id
      };

      if (summary) updateData.conversation_summary = summary;
      if (keyInsights) updateData.key_insights = keyInsights;
      if (lastTopics) updateData.last_topics = lastTopics;
      if (userInfo?.name) updateData.user_name = userInfo.name;
      if (userInfo?.company) updateData.user_company = userInfo.company;
      if (userInfo?.goals) updateData.user_goals = userInfo.goals;
      if (userInfo?.challenges) updateData.user_challenges = userInfo.challenges;

      const { error } = await supabase
        .from('conversation_history')
        .upsert(updateData, {
          onConflict: 'user_id,agent_id'
        });

      if (error) {
        console.error('Error updating conversation history:', error);
      }
    } catch (error) {
      console.error('Error updating conversation history:', error);
    }
  }
}

// Create and export a singleton instance
export const sessionManager = new SessionManagerImpl();

// Export the class for testing purposes
export { SessionManagerImpl };
