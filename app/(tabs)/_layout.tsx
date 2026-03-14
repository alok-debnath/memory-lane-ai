import { Tabs } from "expo-router";
import { Mic, LayoutDashboard, BrainCircuit, Bell, Clock } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary.get(),
        tabBarInactiveTintColor: theme.gray8.get(),
        tabBarStyle: {
          backgroundColor: theme.background.get(),
          borderTopColor: theme.borderColor.get(),
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diary",
          tabBarIcon: ({ color }) => <BrainCircuit color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "Record",
          tabBarIcon: ({ color }) => (
            <Mic color={theme.background.get()} size={28} />
          ),
          tabBarButton: (props) => (
            <RecordButton {...props} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color }) => <Clock color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="review"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="stats"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="graph"
        options={{ href: null }}
      />
    </Tabs>
  );
}

// A custom circular button for the central recording tab
import { TouchableOpacity, View } from "react-native";
import { Stack } from "tamagui";

const RecordButton = ({ children, onPress, theme }: any) => (
  <TouchableOpacity
    style={{
      top: -15,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.primary.get(),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    }}
    onPress={onPress}
  >
    <Stack
      width={60}
      height={60}
      borderRadius={30}
      backgroundColor={theme.primary.get()}
      justifyContent="center"
      alignItems="center"
    >
      {children}
    </Stack>
  </TouchableOpacity>
);
