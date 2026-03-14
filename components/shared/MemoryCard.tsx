import { YStack, XStack, Text, Button } from "tamagui";
import { Lock, Bell, Trash2, Edit3, MapPin, User, Volume2, Calendar } from "@tamagui/lucide-icons";
import { useTimezone } from "../../hooks/useTimezone";

export interface MemoryNote {
  _id: string;
  title: string;
  content: string;
  category?: string;
  reminder_date?: string;
  capsule_unlock_date?: string;
  tags?: string[];
  people?: string[];
  locations?: string[];
  mood?: string;
  importance?: string;
  _creationTime: number;
}

export function MemoryCard({ note, onDelete, onEdit }: { note: MemoryNote, onDelete?: () => void, onEdit?: () => void }) {
  const { formatTz } = useTimezone();
  const isLocked = note.capsule_unlock_date && new Date() < new Date(note.capsule_unlock_date);

  return (
    <YStack backgroundColor="$gray2" borderRadius="$4" padding="$4" gap="$3" marginBottom="$3" opacity={isLocked ? 0.7 : 1}>
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" alignItems="center" flex={1}>
          {isLocked ? (
            <Lock size={20} color="$gray10" />
          ) : (
            <YStack backgroundColor="$primary" padding="$2" borderRadius="$10">
              <Text color="$background" fontSize="$2" fontWeight="bold">
                {note.category?.charAt(0).toUpperCase() || "📝"}
              </Text>
            </YStack>
          )}
          <Text fontSize="$5" fontWeight="bold" numberOfLines={1}>{note.title}</Text>
        </XStack>
      </XStack>

      {isLocked ? (
        <Text color="$gray10" fontStyle="italic">
          🔒 Locked until {formatTz(note.capsule_unlock_date!, "MMM d, yyyy")}
        </Text>
      ) : (
        <Text color="$gray11" numberOfLines={3}>{note.content}</Text>
      )}

      <XStack flexWrap="wrap" gap="$2" rowGap="$2" alignItems="center">
        {!isLocked && note.tags?.map(t => (
          <Text key={t} backgroundColor="$gray4" color="$color" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$4" fontSize="$2">{t}</Text>
        ))}
        {note.people && note.people.length > 0 && !isLocked && (
          <XStack alignItems="center" gap="$1">
            <User size={12} color="$gray10" />
            <Text color="$gray10" fontSize="$2">{note.people.join(", ")}</Text>
          </XStack>
        )}
        {note.locations && note.locations.length > 0 && !isLocked && (
          <XStack alignItems="center" gap="$1">
            <MapPin size={12} color="$gray10" />
            <Text color="$gray10" fontSize="$2">{note.locations.join(", ")}</Text>
          </XStack>
        )}
        {note.reminder_date && (
          <XStack alignItems="center" gap="$1" backgroundColor="$primary" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$4">
            <Bell size={12} color="$background" />
            <Text color="$background" fontSize="$2">{formatTz(note.reminder_date, "MMM d")}</Text>
          </XStack>
        )}
      </XStack>

      {/* Footer Actions */}
      <XStack justifyContent="space-between" alignItems="center" borderTopWidth={1} borderColor="$gray4" paddingTop="$3">
        <XStack alignItems="center" gap="$1">
          <Calendar size={12} color="$gray10" />
          <Text fontSize="$2" color="$gray10">{formatTz(note._creationTime, "MMM d, yyyy")}</Text>
        </XStack>

        {!isLocked && (
          <XStack gap="$2">
            <Button size="$2" circular icon={<Edit3 size={14} />} variant="outlined" onPress={onEdit} />
            <Button size="$2" circular icon={<Trash2 size={14} color="$red10" />} variant="outlined" onPress={onDelete} />
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}
