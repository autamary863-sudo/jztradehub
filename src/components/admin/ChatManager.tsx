import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  MessageCircle, 
  User, 
  Clock, 
  Send,
  Bot,
  X,
  RefreshCw,
  Headphones,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  user_id: string;
  status: string;
  is_ai_mode: boolean;
  needs_agent: boolean;
  assigned_agent_id: string | null;
  pending_since: string | null;
  created_at: string;
  user_profile?: {
    display_name: string;
    avatar_url: string;
  };
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "ai" | "agent";
  sender_id: string | null;
  content: string;
  created_at: string;
}

const ChatManager = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    const channel = supabase
      .channel('admin-chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      
      const channel = supabase
        .channel(`chat-${activeConversation.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConversation.id}` }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Get conversations that need agent attention
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .or(`needs_agent.eq.true,and(assigned_agent_id.eq.${user?.id},status.eq.active)`)
        .order("pending_since", { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get last message for each
      const convWithDetails = await Promise.all((data || []).map(async (conv) => {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...conv,
          user_profile: profileMap.get(conv.user_id),
          last_message: lastMsg?.content || "",
          last_message_time: lastMsg?.created_at || "",
        };
      }));

      setConversations(convWithDetails);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const acceptChat = async (conv: Conversation) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ 
          assigned_agent_id: user.id,
          needs_agent: false,
          pending_since: null
        })
        .eq("id", conv.id);

      if (error) throw error;

      await supabase.from("chat_messages").insert({
        conversation_id: conv.id,
        sender_type: "agent",
        sender_id: user.id,
        content: "👋 Hello! I'm here to help. How can I assist you today?",
      });

      toast.success("Chat accepted!");
      fetchConversations();
      setActiveConversation({ ...conv, assigned_agent_id: user.id, needs_agent: false });
    } catch (error) {
      console.error("Error accepting chat:", error);
      toast.error("Failed to accept chat");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConversation || !user || sending) return;

    const messageContent = input.trim();
    setInput("");
    setSending(true);

    try {
      await supabase.from("chat_messages").insert({
        conversation_id: activeConversation.id,
        sender_type: "agent",
        sender_id: user.id,
        content: messageContent,
      });

      setMessages((prev) => [...prev, {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversation.id,
        sender_type: "agent",
        sender_id: user.id,
        content: messageContent,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    if (!activeConversation) return;

    try {
      await supabase
        .from("chat_conversations")
        .update({ status: "closed" })
        .eq("id", activeConversation.id);

      toast.success("Chat closed");
      setActiveConversation(null);
      setMessages([]);
      fetchConversations();
    } catch (error) {
      console.error("Error closing chat:", error);
      toast.error("Failed to close chat");
    }
  };

  const needsAgentCount = conversations.filter(c => c.needs_agent && !c.assigned_agent_id).length;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Conversations List */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Chat Requests
              {needsAgentCount > 0 && (
                <Badge variant="destructive">{needsAgentCount}</Badge>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={fetchConversations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No chat requests</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "p-4 hover:bg-accent/5 transition-colors cursor-pointer",
                    activeConversation?.id === conv.id && "bg-primary/5"
                  )}
                  onClick={() => setActiveConversation(conv)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      conv.needs_agent ? "bg-red-500/10" : "bg-green-500/10"
                    )}>
                      <User className={cn(
                        "w-5 h-5",
                        conv.needs_agent ? "text-red-500" : "text-green-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {conv.user_profile?.display_name || "Customer"}
                        </p>
                        {conv.pending_since && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(conv.pending_since).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message || "Requested human agent"}
                      </p>
                      {conv.needs_agent && !conv.assigned_agent_id && (
                        <Button 
                          size="sm" 
                          className="mt-2 w-full" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptChat(conv);
                          }}
                        >
                          <Headphones className="w-4 h-4 mr-1" />
                          Accept Chat
                        </Button>
                      )}
                      {conv.assigned_agent_id === user?.id && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="glass-strong lg:col-span-2">
        {!activeConversation ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No chat selected</p>
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {activeConversation.user_profile?.display_name || "Customer"}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {activeConversation.assigned_agent_id === user?.id ? (
                        <Badge variant="default" className="text-xs">You are assisting</Badge>
                      ) : activeConversation.needs_agent ? (
                        <Badge variant="destructive" className="text-xs">Needs Agent</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">AI Mode</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={closeChat}>
                  <X className="w-4 h-4 mr-1" />
                  Close Chat
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.sender_type === "agent" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.sender_type !== "agent" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {msg.sender_type === "ai" ? (
                            <Bot className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                          msg.sender_type === "agent"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : msg.sender_type === "user"
                            ? "bg-muted rounded-bl-md"
                            : "bg-accent/10 rounded-bl-md"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your response..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default ChatManager;