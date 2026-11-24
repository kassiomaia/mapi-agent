import { createContext, useContext } from "react";

export type ChatActions = Readonly<{
  send: (text: string) => void;
  canSend: boolean;
  current: boolean;
}>;

const ChatActionsContext = createContext<ChatActions>({ send: () => undefined, canSend: false, current: false });

export const ChatActionsProvider = ChatActionsContext.Provider;

export function useChatActions(): ChatActions {
  return useContext(ChatActionsContext);
}
