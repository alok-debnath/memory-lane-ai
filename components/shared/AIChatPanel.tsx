import { YStack, XStack, Text, Button, ScrollView, Input, Spinner } from "tamagui";
import { Send, Bot, User, X } from "@tamagui/lucide-icons";
import { useAIChat } from "../../hooks/useAIChat";
import { useState } from "react";
import { SheetModal } from "./SheetModal";

export function AIChatPanel({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { messages, sendMessage, isTyping } = useAIChat();
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText("");
  };

  return (
    <SheetModal open={open} onOpenChange={onOpenChange} snapPoints={[90, 50]}>
      <XStack jc="space-between" ai="center" pb="$4" borderBottomWidth={1} borderColor="$gray5">
        <XStack ai="center" space="$2">
          <Bot size={24} color="$primary" />
          <Text fontSize="$6" fontWeight="bold">AI Assistant</Text>
        </XStack>
        <Button size="$3" circular icon={<X size={16} />} onPress={() => onOpenChange(false)} variant="ghost" />
      </XStack>

      <ScrollView f={1} py="$4" showsVerticalScrollIndicator={false}>
        {messages.length === 0 && (
          <YStack ai="center" jc="center" h={200} space="$2">
            <Text color="$gray10">Ask me anything about your memories!</Text>
            <Text color="$gray9" fontSize="$2">"When did I last go to Paris?"</Text>
          </YStack>
        )}

        {messages.map((msg, i) => (
          <XStack key={i} jc={msg.role === "user" ? "flex-end" : "flex-start"} mb="$4">
            {msg.role === "assistant" && <Bot size={24} color="$primary" mt="$2" mr="$2" />}
            <YStack
              bg={msg.role === "user" ? "$primary" : "$gray3"}
              p="$3"
              br="$4"
              maxWidth="80%"
            >
              <Text color={msg.role === "user" ? "$background" : "$color"}>
                {msg.content}
              </Text>
            </YStack>
          </XStack>
        ))}

        {isTyping && (
          <XStack ai="center" space="$2" mb="$4">
            <Bot size={24} color="$primary" />
            <Spinner size="small" color="$primary" />
          </XStack>
        )}
      </ScrollView>

      <XStack space="$2" ai="center" pt="$4">
        <Input
          flex={1}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          bg="$gray2"
        />
        <Button
          bg="$primary"
          color="$background"
          icon={<Send size={16} />}
          onPress={handleSend}
          disabled={isTyping || !inputText.trim()}
          circular
        />
      </XStack>
    </SheetModal>
  );
}
