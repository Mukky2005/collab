import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketHookProps {
  documentId: number;
  onDocumentUpdate?: (data: any) => void;
  onCursorUpdate?: (data: any) => void;
  onActiveUsers?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
}

// This is a completely disabled version of the WebSocket hook
// to avoid DOMException errors in Replit environment
export function useWebSocket({
  documentId,
}: WebSocketHookProps): WebSocketHookReturn {
  // Create a dummy message sender that just logs the messages
  const sendMessage = useCallback((message: WebSocketMessage) => {
    console.log("WebSocket disabled. Message would have been:", message);
  }, []);

  return {
    isConnected: false,
    sendMessage,
  };
}
