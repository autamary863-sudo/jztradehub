-- Add status column to better track conversation states
-- Status: 'active' (ongoing), 'pending_agent' (waiting for admin), 'agent_connected' (admin joined), 'closed'
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS pending_since TIMESTAMP WITH TIME ZONE;

-- Add admin SELECT/UPDATE policies for chat tables
CREATE POLICY "Admins can view all conversations"
ON public.chat_conversations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update conversations"
ON public.chat_conversations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all chat messages"
ON public.chat_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));