import { YStack, XStack, Text, Button, ScrollView, Spinner } from "tamagui";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";
import { useMemoryStore } from "../../store/memoryStore";
import { Brain, Search, Bell, Sparkles } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";
import { useState } from "react";
import { MemoryCard } from "../../components/shared/MemoryCard";
import { AIChatPanel } from "../../components/shared/AIChatPanel";

export default function DashboardScreen() {
  const { userId } = useAuthStore();
  const theme = useTheme();
  const [chatOpen, setChatOpen] = useState(false);
  const deleteMemory = useMutation(api.mutations.deleteMemory);

  // Dummy userId for preview if not signed in yet.
  const queryUserId = userId || "js93nf8201hns";

  const notes = useQuery(api.queries.getMemories, { userId: queryUserId }) || [];
  const nudges = useQuery(api.queries.getNudges, { userId: queryUserId }) || [];
  const reminders = useQuery(api.queries.getUpcomingReminders, { userId: queryUserId }) || [];

  if (!notes) {
    return (
      <YStack f={1} bg="$background" ai="center" jc="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$4">
      {/* Header */}
      <XStack jc="space-between" ai="flex-start">
        <YStack>
          <Text fontSize="$8" fontWeight="bold" color="$color">
            Hey there 👋
          </Text>
          <Text fontSize="$3" color="$gray10">
            {notes.length} memories · {reminders.length} upcoming
          </Text>
        </YStack>
      </XStack>

      {/* Stats Row */}
      <XStack space="$2" mt="$4">
        {[
          { label: "Memories", value: notes.length, icon: <Brain size={24} color={theme.color.get()} /> },
          { label: "Reminders", value: reminders.length, icon: <Bell size={24} color={theme.color.get()} /> },
        ].map((stat, i) => (
          <YStack key={i} f={1} bg="$gray3" p="$3" br="$4" ai="center">
            {stat.icon}
            <Text mt="$2" fontSize="$6" fontWeight="bold">{stat.value}</Text>
            <Text fontSize="$2" color="$gray10">{stat.label}</Text>
          </YStack>
        ))}
      </XStack>

      {/* Memory List Header */}
      <XStack mt="$6" jc="space-between" ai="center">
        <Text fontSize="$6" fontWeight="bold">Recent</Text>
        <Button size="$3" icon={<Search size={16} />} circular />
      </XStack>

      {notes.length === 0 ? (
        <YStack ai="center" py="$8" space="$3">
          <YStack bg="$gray4" p="$4" br="$8">
            <Brain size={48} color="$gray8" />
          </YStack>
          <Text fontWeight="bold" fontSize="$5">No memories yet</Text>
          <Text color="$gray10">Tap the mic below to start recording</Text>
        </YStack>
      ) : (
        <YStack space="$3" mt="$2">
          {notes.slice(0, 10).map((note, idx) => (
            <MemoryCard
              key={idx}
              note={note as any}
              onDelete={() => deleteMemory({ id: note._id })}
              onEdit={() => alert("Open Edit Sheet for " + note.title)}
            />
          ))}
        </YStack>
      )}

      {/* Floating Action Button for AI Chat */}
      <Button
        circular
        size="$6"
        icon={<Sparkles size={24} />}
        pos="absolute"
        bottom="$8"
        right="$4"
        bg="$primary"
        color="$background"
        shadowColor="$color"
        shadowRadius={10}
        shadowOpacity={0.2}
        onPress={() => setChatOpen(true)}
      />

      <AIChatPanel open={chatOpen} onOpenChange={setChatOpen} />
    </ScrollView>
  );
}
