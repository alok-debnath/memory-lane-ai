import { YStack, Text, ScrollView } from "tamagui";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";

export default function RemindersScreen() {
  const { userId } = useAuthStore();
  const qId = userId || "js93nf8201hns";
  const reminders = useQuery(api.queries.getUpcomingReminders, { userId: qId as any }) || [];

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6">
      <Text fontSize="$8" fontWeight="bold" mb="$4">Upcoming Reminders</Text>
      {reminders.length === 0 ? (
        <YStack ai="center" py="$8">
          <Text color="$gray10">No upcoming reminders</Text>
        </YStack>
      ) : (
        reminders.map((r, i) => (
          <YStack key={i} bg="$gray2" p="$4" br="$4" mb="$3">
            <Text fontWeight="bold" fontSize="$5">{r.title}</Text>
            <Text color="$primary" mt="$1">Due: {new Date(r.reminder_date!).toLocaleDateString()}</Text>
          </YStack>
        ))
      )}
    </ScrollView>
  );
}
