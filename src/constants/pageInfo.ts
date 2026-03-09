export interface PageInfo {
  title: string;
  description: string;
  features: string[];
}

export const PAGE_INFO: Record<string, PageInfo> = {
  '/': {
    title: 'Dashboard',
    description: 'Your personal command center — a snapshot of everything that matters.',
    features: [
      'Quick overview of all your memories, reminders, and categories',
      'AI-powered nudges based on your diary patterns',
      'Daily flashback to revisit past memories',
      'Smart semantic search across all your notes',
      'Upcoming reminders at a glance',
      'Filter by category for quick access',
    ],
  },
  '/diary': {
    title: 'AI Diary',
    description: 'Speak or type your thoughts freely — AI organizes, corrects grammar, and extracts insights automatically.',
    features: [
      'Voice or text input — just talk naturally',
      'Auto grammar & punctuation correction',
      'Mood & energy level detection',
      'Habit and personality pattern tracking',
      'Likes, dislikes, and action item extraction',
      'AI nudges generated from diary trends',
    ],
  },
  '/timeline': {
    title: 'Timeline',
    description: 'Browse all your memories chronologically, grouped by time periods.',
    features: [
      'Chronological view of all memories',
      'Smart grouping: Today, Yesterday, This Week, etc.',
      'Quick search and semantic AI search',
      'Category filtering',
    ],
  },
  '/reminders': {
    title: 'Reminders',
    description: 'Never miss anything — see all upcoming and overdue reminders in one place.',
    features: [
      'Overdue, today, tomorrow, and upcoming sections',
      'Recurring reminder support',
      'Click to edit any reminder',
    ],
  },
  '/documents': {
    title: 'Documents',
    description: 'Upload and organize important documents — AI extracts key details and tracks expiry dates.',
    features: [
      'Upload PDFs, images, and documents',
      'AI-powered text extraction and classification',
      'Expiry date tracking with alerts',
      'Semantic search across document contents',
    ],
  },
  '/review': {
    title: 'Spaced Review',
    description: 'Strengthen your memory using scientifically-backed spaced repetition.',
    features: [
      'SM-2 algorithm for optimal review intervals',
      'Rate your recall to adjust difficulty',
      'Track review streaks and progress',
      'Add any memory to review queue',
    ],
  },
  '/graph': {
    title: 'Knowledge Graph',
    description: 'Visualize connections between your memories, people, and topics.',
    features: [
      'Interactive node-based visualization',
      'See relationships between memories',
      'Filter by tags and categories',
      'Click nodes to view details',
    ],
  },
  '/stats': {
    title: 'Statistics',
    description: 'Understand your patterns — see trends in mood, categories, and memory creation.',
    features: [
      'Memory creation streak tracking',
      'Category distribution charts',
      'Mood trend analysis over time',
      'Activity heatmap by day',
    ],
  },
  '/profile': {
    title: 'Profile & Settings',
    description: 'Manage your account, preferences, and export your data.',
    features: [
      'Update display name and profile',
      'Theme and appearance settings',
      'Export all your data',
      'Account management',
    ],
  },
};
