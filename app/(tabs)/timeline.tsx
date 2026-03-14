import { YStack, Text, ScrollView } from "tamagui";

export default function TimelineScreen() {
  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6">
      <Text fontSize="$8" fontWeight="bold" mb="$4">Timeline</Text>
      <Text color="$gray10">Your memories chronological view will appear here.</Text>
    </ScrollView>
  );
}
