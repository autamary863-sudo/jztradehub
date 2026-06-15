import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, X, Send, Bot, User, Loader2, Headphones, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_type: "user" | "ai" | "agent";
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  is_ai_mode: boolean;
  needs_agent: boolean;
  assigned_agent_id: string | null;
}

const LiveChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-reply keywords
  const autoReplies: { [key: string]: string } = {
    "hello": "Hello! 👋 Welcome to JZTradeHub support. How can I help you today?",
    "hi": "Hi there! 👋 How can I assist you with your order?",
    "help": "I'd be happy to help! You can ask me about:\n• Order status\n• Delivery tracking\n• Payment issues\n• Returns and refunds\n\nOr type 'agent' to speak with a human.",
    "order": "To check your order status, please go to your dashboard and click on 'My Orders'. You can track each order there.",
    "payment": "Your payment is protected by our escrow system. Funds are only released after you confirm delivery.",
    "delivery": "Delivery typically takes 3-5 business days. You can track your order in the dashboard.",
    "return": "To request a return, go to your order details and click 'Request Return'.",
    "refund": "Refunds are processed within 5-7 business days after return confirmation.",
    "agent": "I'll connect you with a human agent. Please wait a moment...",
    "track": "You can track your order in the Buyer Dashboard under 'My Orders'.",
    "price": "Prices are shown in Nigerian Naira (₦) and include all applicable taxes.",
    "seller": "All sellers on JZTradeHub are verified before they can list products."
  };

  useEffect(() => {
    if (isOpen && user) {
      initOrGetConversation();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (conversation?.id) {
      // Subscribe to new messages
      const channel = supabase
        .channel(`chat-messages-${conversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_id=eq.${conversation.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_type !== "user") {
              setMessages((prev) => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          }
        )
        .subscribe();

      // Subscribe to conversation updates
      const convChannel = supabase
        .channel(`conversation-${conversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_conversations",
            filter: `id=eq.${conversation.id}`,
          },
          (payload) => {
            const updated = payload.new as Conversation;
            setConversation(updated);
            setWaitingForAgent(updated.needs_agent && !updated.assigned_agent_id);
            setAgentJoined(!!updated.assigned_agent_id);
            
            if (updated.assigned_agent_id && !agentJoined) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `agent-joined-${Date.now()}`,
                  sender_type: "ai",
                  content: "🎉 A support agent has joined the chat! They will respond shortly.",
                  created_at: new Date().toISOString(),
                },
              ]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(convChannel);
      };
    }
  }, [conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initOrGetConversation = async () => {
    if (!user) return;

    try {
      // Check for existing active conversation
      const { data: existing, error: fetchError } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setConversation(existing);
        setWaitingForAgent(existing.needs_agent && !existing.assigned_agent_id);
        setAgentJoined(!!existing.assigned_agent_id);
        await fetchMessages(existing.id);
      } else {
        // Create new conversation
        const { data: newConvo, error: insertError } = await supabase
          .from("chat_conversations")
          .insert({ 
            user_id: user.id,
            is_ai_mode: true,
            needs_agent: false,
            status: "active"
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setConversation(newConvo);
        
        // Add welcome message
        const welcomeMsg = {
          id: "welcome",
          sender_type: "ai" as const,
          content: "👋 Welcome to JZTradeHub Support! I'm your AI assistant. I can help with:\n\n• Order tracking\n• Delivery updates\n• Payment issues\n• Returns & refunds\n\nType 'agent' anytime to speak with a human agent.",
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
        
        await supabase.from("chat_messages").insert({
          conversation_id: newConvo.id,
          sender_type: "ai",
          content: welcomeMsg.content,
        });
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const getAutoReply = (message: string): string | null => {
    const lowerMsg = message.toLowerCase();
    
    for (const [key, reply] of Object.entries(autoReplies)) {
      if (lowerMsg.includes(key)) {
        return reply;
      }
    }
    return null;
  };

  const requestHumanAgent = async () => {
    if (!conversation) return;

    try {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ 
          needs_agent: true,
          pending_since: new Date().toISOString()
        })
        .eq("id", conversation.id);

      if (error) throw error;

      setWaitingForAgent(true);
      
      const agentRequestMsg = {
        id: `agent-req-${Date.now()}`,
        sender_type: "ai" as const,
        content: "🕐 Thank you! A human agent has been notified. Please wait a moment for them to join the chat.",
        created_at: new Date().toISOString(),
      };
      
      setMessages((prev) => [...prev, agentRequestMsg]);
      
      await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_type: "ai",
        content: agentRequestMsg.content,
      });

      toast.success("Agent request sent! Please wait...");
    } catch (error) {
      console.error("Error requesting agent:", error);
      toast.error("Failed to request agent");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_type: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Save user message
      await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_type: "user",
        sender_id: user?.id,
        content: userMessage,
      });

      // Check if user wants an agent
      if (userMessage.toLowerCase().includes("agent") && !conversation.needs_agent) {
        await requestHumanAgent();
        setLoading(false);
        return;
      }

      // Get AI response (only if no agent is assigned)
      if (!agentJoined && !waitingForAgent) {
        const autoReply = getAutoReply(userMessage);
        const reply = autoReply || "Thanks for your message! I'll help you with that. If you need more assistance, type 'agent' to speak with a human support agent.";
        
        setTimeout(async () => {
          const aiMsg: Message = {
            id: `ai-${Date.now()}`,
            sender_type: "ai",
            content: reply,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          
          await supabase.from("chat_messages").insert({
            conversation_id: conversation.id,
            sender_type: "ai",
            content: reply,
          });
        }, 800);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-bounce bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-background border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-accent text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  {agentJoined ? <Headphones className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold">JZTradeHub Support</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", 
                      agentJoined ? "bg-green-400" : waitingForAgent ? "bg-yellow-400 animate-pulse" : "bg-green-400"
                    )} />
                    <span className="text-xs opacity-90">
                      {agentJoined ? "Agent Online" : waitingForAgent ? "Connecting to agent..." : "AI Assistant"}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.sender_type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.sender_type !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {msg.sender_type === "ai" ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <Headphones className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                      msg.sender_type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : msg.sender_type === "ai"
                        ? "bg-muted rounded-bl-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Request Agent Button */}
          {!agentJoined && !waitingForAgent && conversation?.is_ai_mode && (
            <div className="px-4 py-2 border-t bg-muted/5">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-2"
                onClick={requestHumanAgent}
              >
                <Headphones className="w-3 h-3" />
                Request Human Agent
              </Button>
            </div>
          )}

          {/* Waiting Status */}
          {waitingForAgent && !agentJoined && (
            <div className="px-4 py-2 border-t bg-yellow-500/10">
              <div className="flex items-center justify-center gap-2 text-xs text-yellow-600">
                <Clock className="w-3 h-3 animate-pulse" />
                <span>Connecting you to a human agent...</span>
              </div>
            </div>
          )}

          {/* Agent Online Status */}
          {agentJoined && (
            <div className="px-4 py-2 border-t bg-green-500/10">
              <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                <Headphones className="w-3 h-3" />
                <span>Agent is online and will respond shortly</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={agentJoined ? "Type your message..." : waitingForAgent ? "Waiting for agent..." : "Type your message..."}
                disabled={loading || waitingForAgent}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim() || waitingForAgent} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChat;