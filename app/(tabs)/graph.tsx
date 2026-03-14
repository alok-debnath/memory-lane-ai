import { ScrollView, YStack, Text, XStack } from "tamagui";
import { Share2 } from "@tamagui/lucide-icons";

export default function KnowledgeGraphScreen() {
  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$6">
      <XStack ai="center" space="$2">
        <Share2 size={28} color="$primary" />
        <Text fontSize="$8" fontWeight="bold">Knowledge Graph</Text>
      </XStack>

      <YStack f={1} bg="$gray2" p="$6" br="$6" minHeight={400} jc="center" ai="center">
        <Text color="$gray10" ta="center">
          Interactive nodes visualization of tags, people, and locations connected to your memories.
          (Uses React Native SVG or D3 internally when connected to Convex semantic queries)
        </Text>
      </YStack>
    </ScrollView>
  );
}
