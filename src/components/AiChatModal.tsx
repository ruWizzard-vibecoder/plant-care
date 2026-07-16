"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiChatModalProps {
  open: boolean;
  onClose: () => void;
  plantId: string;
  plantName: string;
}

const SUGGESTED_QUESTIONS = [
  "Как часто поливать?",
  "Почему желтеют листья?",
  "Какое освещение нужно?",
  "Нужна ли пересадка?",
];

export function AiChatModal({ open, onClose, plantId, plantName }: AiChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const assistantId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const res = await fetch("/api/ai-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plantId,
            question: text.trim(),
          }),
        });

        if (!res.ok) {
          let errorText: string;
          if (res.status === 401) {
            errorText = "Сессия истекла. Войдите снова.";
          } else if (res.status === 429) {
            errorText = "Слишком много запросов. Подождите минуту.";
          } else {
            errorText = "Не удалось получить ответ. Попробуйте позже.";
          }
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: errorText } : msg
            )
          );
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                // Anthropic Messages API SSE format
                const delta =
                  parsed.type === "content_block_delta"
                    ? parsed.delta?.text
                    : undefined;
                if (delta) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? { ...msg, content: msg.content + delta }
                        : msg
                    )
                  );
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: "Извините, не удалось получить ответ. Попробуйте позже." }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, plantId]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-auto flex max-h-[85vh] flex-col rounded-t-3xl bg-surface animate-sheet lg:m-auto lg:h-[70vh] lg:w-full lg:max-w-2xl lg:rounded-3xl">
        {/* Handle + header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf/10">
              <Sparkles size={14} className="text-leaf" />
            </div>
            <div>
              <p className="text-sm font-bold">AI Помощник</p>
              <p className="text-[10px] text-muted-foreground">{plantName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-red-50"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
                <Leaf size={28} className="text-stem" />
              </div>
              <p className="mt-4 text-sm font-semibold">
                Спросите что угодно о {plantName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Советы по уходу, диагностика проблем, рекомендации
              </p>

              {/* Suggested questions */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-leaf/20 bg-leaf/5 px-3 py-1.5 text-xs font-medium text-leaf transition-colors hover:bg-leaf/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-leaf text-white rounded-br-md"
                    : "bg-greenhouse text-foreground rounded-bl-md"
                )}
              >
                {msg.content || (
                  <Loader2 size={14} className="animate-spin text-stem" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-border/30 p-3"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Задайте вопрос..."
              disabled={isLoading}
              maxLength={500}
              className={cn(
                "flex-1 rounded-xl border border-border/60 bg-surface py-2.5 px-3.5",
                "text-sm placeholder:text-muted-foreground/60",
                "focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10",
                "transition-all duration-200 disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                "bg-leaf text-white transition-all active:scale-90",
                "disabled:opacity-40"
              )}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
