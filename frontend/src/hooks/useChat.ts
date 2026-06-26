import { useMutation } from "@tanstack/react-query";
import { apiFetch, type ChatMessageRequest, type ChatMessageResponse } from "@/lib/api";

export function useChat() {
  return useMutation<ChatMessageResponse, Error, ChatMessageRequest>({
    mutationFn: (payload) =>
      apiFetch<ChatMessageResponse>("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}
