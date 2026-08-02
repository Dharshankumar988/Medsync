"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Image as ImageIcon, Paperclip, X, Copy, Check, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiService } from "@/services/ai.service";
import { PulseAIIcon } from "./PulseAIIcon";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface PulseAIChatProps {
  role: "doctor" | "patient" | "pharmacy" | "admin";
  fullPage?: boolean;
}

const PLUGINS = [remarkGfm];

const ChatMessage = memo(function ChatMessage({ 
  message, 
  onCopy, 
  copiedId 
}: { 
  message: Message; 
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}
    >
      <div 
        className={cn(
          "group relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          message.role === "user" 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted text-foreground rounded-tl-sm border border-border/50"
        )}
      >
        <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:text-zinc-50 max-w-none">
          <ReactMarkdown remarkPlugins={PLUGINS}>
            {message.content}
          </ReactMarkdown>
        </div>

        {message.role === "assistant" && message.content && (
          <button 
            onClick={() => onCopy(message.id, message.content)}
            className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md text-muted-foreground"
            title="Copy message"
          >
            {copiedId === message.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </motion.div>
  );
});

export function PulseAIChat({ role, fullPage = false }: PulseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    try {
      await aiService.streamChat(
        role,
        userMessage.content,
        sessionId,
        (chunk) => {
          setMessages((prev) => 
            prev.map((m) => 
              m.id === assistantMessageId 
                ? { ...m, content: m.content + chunk } 
                : m
            )
          );
        },
        () => {
          setIsLoading(false);
        },
        (error) => {
          console.error("Stream error:", error);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }, [input, isLoading, role, sessionId]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className={cn("flex flex-col bg-card overflow-hidden", fullPage ? "h-full rounded-none" : "h-[600px] w-[400px] rounded-2xl shadow-2xl border border-border")}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4 bg-muted/30">
        <PulseAIIcon size={32} animate={isLoading} />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pulse AI</h2>
          <p className="text-xs text-muted-foreground capitalize">{role} Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
            <PulseAIIcon size={48} className="mb-4" />
            <p className="text-sm font-medium">How can I assist you today?</p>
          </div>
        )}
        
        {messages.map((m) => (
          <ChatMessage 
            key={m.id} 
            message={m} 
            onCopy={handleCopy} 
            copiedId={copiedId} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <div className="relative flex items-end gap-2 bg-muted/50 p-2 rounded-xl border border-border focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md shrink-0">
            <Paperclip size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Pulse AI..."
            className="w-full max-h-32 min-h-[40px] resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-2 text-center">
          <span className="text-[10px] text-muted-foreground">Pulse AI can make mistakes. Verify important medical information.</span>
        </div>
      </div>
    </div>
  );
}
