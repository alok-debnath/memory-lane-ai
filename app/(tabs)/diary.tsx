import { YStack, Text, Button, ScrollView, XStack } from "tamagui";
import { Mic, Keyboard, Brain } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "tamagui";

export default function DiaryScreen() {
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const { userId } = useAuthStore();
  const theme = useTheme();

  // Dummy user ID
  const qId = userId || "js93nf8201hns";
  const entries = useQuery(api.queries.getDiaryEntries, { userId: qId }) || [];

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$6">
      <XStack jc="space-between" ai="flex-start">
        <YStack>
          <XStack ai="center" space="$2">
            <Brain size={24} color={theme.primary.get()} />
            <Text fontSize="$8" fontWeight="bold" color="$color">AI Diary</Text>
          </XStack>
          <Text fontSize="$3" color="$gray10" mt="$1">
            Speak or type your thoughts · AI will organize & analyze them
          </Text>
        </YStack>
      </XStack>

      {/* Mode Switcher */}
      <XStack space="$2" bg="$gray3" p="$1" br="$4" ai="center">
        <Button
          flex={1}
          size="$3"
          variant={mode === "voice" ? "primary" : "ghost"}
          icon={<Mic size={16} />}
          onPress={() => setMode("voice")}
        >
          Voice
        </Button>
        <Button
          flex={1}
          size="$3"
          variant={mode === "text" ? "primary" : "ghost"}
          icon={<Keyboard size={16} />}
          onPress={() => setMode("text")}
        >
          Type
        </Button>
      </XStack>

      <YStack bg="$gray2" p="$6" br="$6" ai="center" jc="center" minHeight={200}>
        <Text color="$gray10">
          {mode === "voice" ? "Tap microphone to record..." : "Type your thoughts here..."}
        </Text>
        {/* Placeholder for actual audio/text input logic */}
      </YStack>

      <YStack space="$3">
        <Text fontSize="$6" fontWeight="bold">Recent Entries</Text>
        {entries.length === 0 ? (
          <YStack ai="center" py="$4">
            <Text color="$gray10">No entries yet.</Text>
          </YStack>
        ) : (
          entries.map((entry, idx) => (
            <YStack key={idx} bg="$gray2" p="$4" br="$4">
              <Text fontWeight="bold" fontSize="$5">{new Date(entry._creationTime).toLocaleDateString()}</Text>
              <Text color="$gray11" mt="$2">{entry.raw_text}</Text>
            </YStack>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}
