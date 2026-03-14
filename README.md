# MemoryApp — Voice & Text Memory Capture (Universal App)

A full-stack, cross-platform memory capture application where users record memories via voice or text, and AI automatically enriches them with metadata (people, locations, sentiment, actions, etc.).

This application has been rebuilt from the ground up to support **Web, iOS, and Android** using a modern, performant, universal stack: **Expo**, **Tamagui**, and **Convex**.

---

## 🚀 Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| **Framework**  | [Expo](https://expo.dev) + [React Native](https://reactnative.dev) (Universal App) |
| **Styling**    | [Tamagui](https://tamagui.dev) (Optimizing CSS-in-JS Compiler) |
| **Routing**    | Expo Router (File-based navigation)                           |
| **Backend**    | [Convex](https://convex.dev) (Real-time Database + Serverless Functions) |
| **State**      | Zustand + Convex React Hooks                                  |
| **Auth**       | Clerk (Integrated with Convex)                                |
| **Icons**      | `@tamagui/lucide-icons`                                       |

---

## 📂 Project Structure

```
├── app/                      # Expo Router File-based Routes
│   ├── (tabs)/               # Bottom Tab Navigation (Dashboard, Diary, Record, Timeline, etc.)
│   ├── _layout.tsx           # Root Layout (Providers: Convex, Clerk, Tamagui)
│   └── auth.tsx              # Authentication Screen
├── components/
│   └── shared/               # Reusable Tamagui UI Components (MemoryCard, AIChatPanel, SheetModal)
├── convex/                   # Convex Backend Services
│   ├── schema.ts             # Typed Database Schema & Vector Indexes
│   ├── queries.ts            # Reactive Database Queries
│   ├── mutations.ts          # State-changing Database Operations
│   └── actions.ts            # Serverless functions (AI calls, vector search)
├── hooks/                    # Custom React Hooks
│   ├── useVoice.ts           # Expo-AV wrapper for voice recording
│   ├── useTimezone.ts        # Expo-localization timezone handling
│   └── useAIChat.ts          # State hook for conversational AI
├── store/                    # Zustand Global State
│   ├── authStore.ts          # Local UI auth state & timezone
│   ├── memoryStore.ts        # Search & filtering UI state
│   └── themeStore.ts         # Light/Dark mode toggling
├── tamagui.config.ts         # Tamagui Design System Tokens & Configuration
└── package.json              # Project Dependencies
```

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or newer recommended)
- [Bun](https://bun.sh/) (Fast all-in-one JavaScript runtime)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A [Convex Account](https://dashboard.convex.dev/) (For backend deployment)
- A [Clerk Account](https://clerk.com/) (For Authentication)

---

## ⚙️ Setup & Installation

**1. Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

**2. Install dependencies**
We use `bun` for blazingly fast installations and runtime execution.
```bash
bun install
```

**3. Configure Environment Variables**
Copy the example environment file:
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your actual keys:
- `EXPO_PUBLIC_CONVEX_URL`: Your Convex deployment URL.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk Publishable Key for Expo.

**4. Setup Convex Backend**
Initialize and push your database schema and functions to Convex.
*(This command will prompt you to log in to Convex if you aren't already.)*
```bash
npx convex dev
```

---

## 🏃‍♂️ Running the Application

Once dependencies are installed and the backend is running, you can start the Expo development server:

```bash
bun start
```

This will open the Expo developer menu in your terminal. From there, you can press:
- `w` to open the app in your web browser.
- `i` to open in the iOS Simulator (Requires macOS with Xcode).
- `a` to open in the Android Emulator (Requires Android Studio).

> **Note:** For physical devices, download the **Expo Go** app from the App Store or Google Play and scan the QR code displayed in your terminal.

---

## 🧠 Core Features & Architecture

### Backend (Convex)
Convex completely replaces Supabase in this architecture.
- **Database:** Fully typed tables are defined in `convex/schema.ts`.
- **Vector Search:** `embedding` columns and `vectorIndex` are used directly in Convex (replacing `pgvector`).
- **AI Functions:** Edge functions are replaced by Convex **Actions** (`convex/actions.ts`) which can communicate with external AI APIs (like Gemini/OpenAI).

### Frontend UI (Tamagui)
We use Tamagui to build universal, cross-platform UI components that compile to optimized native code on iOS/Android and standard CSS on the web.
- **No Tailwind:** Tailwind classes are replaced by Tamagui's styled components (`<XStack>`, `<YStack>`, `<Text>`, `<Button>`).
- **Themes:** Dark/Light mode is handled natively by Tamagui's `<Theme>` provider, integrated with `useThemeStore` (Zustand).

### State Management
- **Server State:** Convex React hooks (`useQuery`, `useMutation`) automatically handle real-time data fetching, caching, and invalidation.
- **Client State:** `zustand` is used for lightweight, fast global client state (e.g., active filters, theme settings).

---

## 🔒 Authentication Flow
The app is secured using **Clerk** integrated tightly with Convex.
1. The `<ConvexProviderWithClerk>` in `_layout.tsx` passes the Clerk session token to Convex.
2. Users are automatically authenticated on backend requests.
3. The `convex/mutations.ts -> createUser` mutation syncs Clerk users into the native Convex database for relational querying.

---

## 📦 Deployment

### Backend (Convex)
To deploy your Convex functions and schema to production:
```bash
npx convex deploy
```

### Frontend (Expo Web/Mobile)
To build the application for the app stores or web, we use **EAS (Expo Application Services)**:

**Web:**
```bash
npx expo export -p web
```

**iOS / Android Native Builds:**
```bash
eas build --platform all
```
*(Requires setting up an EAS account and configuring `eas.json`)*
