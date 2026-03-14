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
      <XStack justifyContent="space-between" alignItems="center" paddingBottom="$4" borderBottomWidth={1} borderColor="$gray5">
        <XStack alignItems="center" gap="$2">
          <Bot size={24} color="$primary" />
          <Text fontSize="$6" fontWeight="bold">AI Assistant</Text>
        </XStack>
        <Button size="$3" circular icon={<X size={16} />} onPress={() => onOpenChange(false)} variant="outlined" />
      </XStack>

      <ScrollView flex={1} paddingVertical="$4" showsVerticalScrollIndicator={false}>
        {messages.length === 0 && (
          <YStack alignItems="center" justifyContent="center" height={200} gap="$2">
            <Text color="$gray10">Ask me anything about your memories!</Text>
            <Text color="$gray9" fontSize="$2">"When did I last go to Paris?"</Text>
          </YStack>
        )}

        {messages.map((msg, i) => (
          <XStack key={i} justifyContent={msg.role === "user" ? "flex-end" : "flex-start"} marginBottom="$4">
            {msg.role === "assistant" && <Bot size={24} color="$primary" marginTop="$2" marginRight="$2" />}
            <YStack
              backgroundColor={msg.role === "user" ? "$primary" : "$gray3"}
              padding="$3"
              borderRadius="$4"
              maxWidth="80%"
            >
              <Text color={msg.role === "user" ? "$background" : "$color"}>
                {msg.content}
              </Text>
            </YStack>
          </XStack>
        ))}

        {isTyping && (
          <XStack alignItems="center" gap="$2" marginBottom="$4">
            <Bot size={24} color="$primary" />
            <Spinner size="small" color="$primary" />
          </XStack>
        )}
      </ScrollView>

      <XStack gap="$2" alignItems="center" paddingTop="$4">
        <Input
          flex={1}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          backgroundColor="$gray2"
        />
        <Button
          backgroundColor="$primary"
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
