import { YStack, Text, Button, Input, XStack } from "tamagui";
import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function AuthScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const onSignInPress = async () => {
    if (!isLoaded) return;
    try {
      const completeSignIn = await signIn.create({ identifier: emailAddress, password });
      await setActive({ session: completeSignIn.createdSessionId });
      router.replace("/(tabs)");
    } catch (err) {
      alert("Sign in failed");
    }
  };

  return (
    <YStack f={1} ai="center" jc="center" bg="$background" px="$4">
      <Text fontSize="$8" fontWeight="bold" mb="$6">Sign In</Text>

      <YStack w="100%" space="$4">
        <Input
          autoCapitalize="none"
          placeholder="Email..."
          value={emailAddress}
          onChangeText={setEmailAddress}
        />
        <Input
          secureTextEntry
          placeholder="Password..."
          value={password}
          onChangeText={setPassword}
        />

        <Button onPress={onSignInPress} bg="$primary" color="$background">
          Login
        </Button>
      </YStack>
    </YStack>
  );
}
