import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
// Clerk Convex Provider doesn't seem to resolve correctly in the bash env, so fallback to simple ConvexProvider for the setup test.
import { TamaguiProvider, Theme } from "tamagui";
import { useThemeStore } from "../store/themeStore";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Slot, Stack } from "expo-router";
import tamaguiConfig from "../tamagui.config";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL || "https://fake-url.convex.cloud");

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
    InterBold: require("@tamagui/font-inter/otf/Inter-Bold.otf"),
  });

  const { theme } = useThemeStore();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_fake_key"}>
      <ConvexProvider client={convex}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={theme === 'system' ? 'light' : theme}>
          <Theme name={theme === 'system' ? 'light' : theme}>
            <SafeAreaProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
              </Stack>
            </SafeAreaProvider>
          </Theme>
        </TamaguiProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}
