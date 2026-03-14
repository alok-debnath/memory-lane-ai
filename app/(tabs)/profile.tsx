import { YStack, Text, ScrollView, Button, XStack } from "tamagui";
import { User, LogOut, Moon, Sun, Settings } from "@tamagui/lucide-icons";
import { useAuth, useClerk } from "@clerk/clerk-expo";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useAuth();
  const { timezone } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  return (
    <ScrollView bg="$background" f={1} px="$4" py="$6" space="$6">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$8" fontWeight="bold">Profile</Text>
        <Button size="$3" circular icon={<Settings size={16} />} />
      </XStack>

      <YStack bg="$gray2" p="$6" br="$6" ai="center" space="$4">
        <YStack w={80} h={80} bg="$primary" br="$10" jc="center" ai="center">
          <User size={40} color="$background" />
        </YStack>
        <Text fontSize="$6" fontWeight="bold">{user?.primaryEmailAddress?.emailAddress || "Guest User"}</Text>
        <Text color="$gray10">Timezone: {timezone}</Text>
      </YStack>

      <Text fontSize="$6" fontWeight="bold" mt="$4">Preferences</Text>

      <YStack space="$2">
        <Button
          bg="$gray3"
          color="$color"
          icon={theme === "dark" ? <Sun /> : <Moon />}
          onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
          jc="flex-start"
          px="$4"
        >
          Toggle {theme === "dark" ? "Light" : "Dark"} Mode
        </Button>

        <Button
          bg="$red10"
          color="white"
          icon={<LogOut />}
          onPress={() => signOut()}
          jc="flex-start"
          px="$4"
          mt="$4"
        >
          Sign Out
        </Button>
      </YStack>
    </ScrollView>
  );
}
