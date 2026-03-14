import { ScrollView, YStack, Text, XStack } from "tamagui";
import { BarChart2 } from "@tamagui/lucide-icons";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";

export default function StatsScreen() {
  const { userId } = useAuthStore();
  const qId = userId || "js93nf8201hns";
  const stats = useQuery(api.queries_extra.getStats, { userId: qId as any }) || {
    totalMemories: 0,
    categoriesCount: {},
    moodsCount: {},
  };

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$6">
      <XStack jc="space-between" ai="center">
        <XStack ai="center" space="$2">
          <BarChart2 size={28} color="$primary" />
          <Text fontSize="$8" fontWeight="bold">Statistics</Text>
        </XStack>
      </XStack>

      <YStack bg="$primary" p="$4" br="$6" ai="center">
        <Text fontSize="$8" fontWeight="bold" color="$background">{stats.totalMemories}</Text>
        <Text fontSize="$3" color="$background" opacity={0.8}>Total Memories</Text>
      </YStack>

      <Text fontSize="$6" fontWeight="bold" mt="$4">Categories Breakdown</Text>
      <YStack space="$2">
        {Object.entries(stats.categoriesCount).map(([cat, count]) => (
          <XStack key={cat} bg="$gray2" p="$3" br="$4" jc="space-between" ai="center">
            <Text fontSize="$5" fontWeight="500" tt="capitalize">{cat}</Text>
            <Text fontSize="$5" color="$gray11">{count as number}</Text>
          </XStack>
        ))}
        {Object.keys(stats.categoriesCount).length === 0 && (
          <Text color="$gray10">Not enough data to display categories.</Text>
        )}
      </YStack>

      <Text fontSize="$6" fontWeight="bold" mt="$4">Mood Trends</Text>
      <YStack space="$2">
        {Object.entries(stats.moodsCount).map(([mood, count]) => (
          <XStack key={mood} bg="$gray2" p="$3" br="$4" jc="space-between" ai="center">
            <Text fontSize="$5" fontWeight="500" tt="capitalize">{mood}</Text>
            <Text fontSize="$5" color="$gray11">{count as number}</Text>
          </XStack>
        ))}
        {Object.keys(stats.moodsCount).length === 0 && (
          <Text color="$gray10">Not enough data to display moods.</Text>
        )}
      </YStack>
    </ScrollView>
  );
}
