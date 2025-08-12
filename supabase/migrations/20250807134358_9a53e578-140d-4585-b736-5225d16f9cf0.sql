-- Clean up duplicate conversation history entries
-- Keep only the most recent entry for each user+agent combination
DELETE FROM conversation_history 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, agent_id) id
    FROM conversation_history
    ORDER BY user_id, agent_id, updated_at DESC
);