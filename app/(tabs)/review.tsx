import { ScrollView, YStack, Text, XStack, Button } from "tamagui";
import { BrainCircuit, Check, X } from "@tamagui/lucide-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "../../store/authStore";
import { useState } from "react";

export default function ReviewScreen() {
  const { userId } = useAuthStore();
  const qId = userId || "js93nf8201hns";
  const schedule = useQuery(api.queries_extra.getReviewSchedule, { userId: qId as any }) || [];
  const updateReview = useMutation(api.mutations.updateReviewSchedule);

  const dueReviews = schedule.filter(s => new Date(s.next_review_at) <= new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentItem = dueReviews[currentIndex];

  const handleScore = async (score: number) => {
    if (!currentItem) return;
    await updateReview({
      id: currentItem._id,
      score, // Action will handle SM-2 Spaced Repetition Logic internally
    });
    setFlipped(false);
    setCurrentIndex(prev => prev + 1);
  };

  if (dueReviews.length === 0 || currentIndex >= dueReviews.length) {
    return (
      <YStack bg="$background" f={1} ai="center" jc="center" p="$4" space="$4">
        <BrainCircuit size={48} color="$primary" />
        <Text fontSize="$6" fontWeight="bold">You're all caught up!</Text>
        <Text color="$gray10" ta="center">Come back later to review more memory flashcards.</Text>
      </YStack>
    );
  }

  return (
    <YStack bg="$background" f={1} px="$4" py="$6" space="$4">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$8" fontWeight="bold">Daily Review</Text>
        <Text color="$gray10">{currentIndex + 1} / {dueReviews.length}</Text>
      </XStack>

      <YStack f={1} bg="$gray2" br="$6" p="$6" jc="center" space="$6"
              shadowColor="$color" shadowRadius={10} shadowOpacity={0.1}>
        <Text fontSize="$4" color="$primary" ta="center">Front</Text>
        <Text fontSize="$6" fontWeight="bold" ta="center">
          {currentItem.memory?.title || "Unknown Memory"}
        </Text>

        {flipped && (
          <YStack mt="$6" pt="$6" borderTopWidth={1} borderColor="$gray5" space="$4">
            <Text fontSize="$4" color="$primary" ta="center">Back (Recall)</Text>
            <Text fontSize="$5" color="$gray11" ta="center">
              {currentItem.memory?.content}
            </Text>
          </YStack>
        )}
      </YStack>

      {!flipped ? (
        <Button size="$5" bg="$primary" color="$background" onPress={() => setFlipped(true)}>
          Show Answer
        </Button>
      ) : (
        <XStack space="$2" ai="center" jc="center" pt="$4">
          <Button flex={1} bg="$red10" color="white" icon={<X />} onPress={() => handleScore(1)}>Hard</Button>
          <Button flex={1} bg="$orange10" color="white" onPress={() => handleScore(3)}>Good</Button>
          <Button flex={1} bg="$green10" color="white" icon={<Check />} onPress={() => handleScore(5)}>Easy</Button>
        </XStack>
      )}
    </YStack>
  );
}
