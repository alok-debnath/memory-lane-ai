import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMemories = query({
  args: {
    userId: v.optional(v.id("users")),
    category: v.optional(v.string()),
    search: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    let memoriesQuery = ctx.db.query("memory_notes")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId));

    if (args.category) {
      memoriesQuery = memoriesQuery.filter(q => q.eq(q.field("category"), args.category));
    }

    const memories = await memoriesQuery.order("desc").collect();

    if (args.search) {
      const lowerSearch = args.search.toLowerCase();
      return memories.filter(m =>
        m.title.toLowerCase().includes(lowerSearch) ||
        m.content.toLowerCase().includes(lowerSearch)
      );
    }

    return memories;
  },
});

export const getUpcomingReminders = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const memories = await ctx.db.query("memory_notes")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    return memories.filter(m => {
      if (!m.reminder_date) return false;
      const d = new Date(m.reminder_date);
      return d >= now && d <= nextWeek;
    });
  },
});

export const getDiaryEntries = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    return await ctx.db.query("diary_entries")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(50);
  },
});

export const getProfile = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return await ctx.db.get(args.userId);
  },
});

export const getNudges = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return [];
    return await ctx.db.query("ai_nudges")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .filter(q => q.eq(q.field("is_acted_on"), false))
      .filter(q => q.eq(q.field("is_dismissed"), false))
      .order("desc")
      .collect();
  },
});

export const getAttachments = query({
  args: { memoryId: v.optional(v.id("memory_notes")) },
  handler: async (ctx, args) => {
    if (!args.memoryId) return [];
    return await ctx.db.query("memory_attachments")
      .withIndex("by_memory", (q) => q.eq("memory_id", args.memoryId))
      .collect();
  },
});
