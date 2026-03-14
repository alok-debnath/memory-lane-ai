import { YStack, Text, Button } from "tamagui";
import { Mic } from "@tamagui/lucide-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";
import { useVoice } from "../../hooks/useVoice";

export default function RecordScreen() {
  const { isRecording, startRecording, stopRecording } = useVoice();
  const { userId } = useAuthStore();
  const qId = userId || "js93nf8201hns";

  const processMemory = useMutation(api.mutations.addMemory);

  const toggleRecord = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      // Normally here you'd upload `uri` to Convex Storage or similar
      // and send for transcription via Convex Action
      await processMemory({
        userId: qId as any,
        title: "Voice Note " + new Date().toLocaleTimeString(),
        content: "Transcribed text from: " + uri?.split("/").pop(),
        is_recurring: false,
        category: "personal",
      });
      alert("Memory Saved!");
    } else {
      await startRecording();
    }
  };

  return (
    <YStack f={1} bg="$background" ai="center" jc="center" p="$4">
      <YStack space="$4" ai="center">
        <Text fontSize="$8" fontWeight="bold">Record a Memory</Text>
        <Text color="$gray10" ta="center">
          Tap the button below and speak your mind. Our AI will transcribe, extract actions, and categorize it automatically.
        </Text>
      </YStack>

      <Button
        mt="$8"
        size="$10"
        circular
        bg={recording ? "$red10" : "$primary"}
        onPress={toggleRecord}
        animation="bouncy"
        scale={recording ? 1.1 : 1}
        pressStyle={{ scale: 0.9 }}
      >
        <Mic size={48} color={recording ? "white" : "$background"} />
      </Button>

      {recording && (
        <Text mt="$4" color="$red10" fontWeight="bold" animation="pulse">
          Recording... Tap to stop
        </Text>
      )}
    </YStack>
  );
}
