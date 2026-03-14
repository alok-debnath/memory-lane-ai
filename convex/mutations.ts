import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      if (args.timezone && existing.timezone !== args.timezone) {
        await ctx.db.patch(existing._id, { timezone: args.timezone });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      timezone: args.timezone || "UTC",
    });
  },
});

export const addMemory = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    reminder_date: v.optional(v.string()),
    is_recurring: v.boolean(),
    recurrence_type: v.optional(v.string()),
    mood: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    people: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("memory_notes", {
      user_id: args.userId,
      title: args.title,
      content: args.content,
      category: args.category,
      reminder_date: args.reminder_date,
      is_recurring: args.is_recurring,
      recurrence_type: args.recurrence_type,
      mood: args.mood,
      tags: args.tags,
      people: args.people,
      locations: args.locations,
    });
  },
});

export const updateMemory = mutation({
  args: {
    id: v.id("memory_notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    reminder_date: v.optional(v.string()),
    is_recurring: v.optional(v.boolean()),
    recurrence_type: v.optional(v.string()),
    mood: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const deleteMemory = mutation({
  args: { id: v.id("memory_notes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addDiaryEntry = mutation({
  args: {
    userId: v.id("users"),
    raw_text: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real flow, an action would call AI, then call this or another mutation
    return await ctx.db.insert("diary_entries", {
      user_id: args.userId,
      raw_text: args.raw_text,
    });
  },
});

export const dismissNudge = mutation({
  args: { id: v.id("ai_nudges") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { is_dismissed: true });
  },
});

export const updateReviewSchedule = mutation({
  args: {
    id: v.id("review_schedule"),
    score: v.number(), // 1 to 5 (SM-2 logic)
  },
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.id);
    if (!schedule) return;

    // Basic SM-2 algo simulation
    const nextInterval = schedule.interval_days * (schedule.ease_factor || 1.5);
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

    await ctx.db.patch(args.id, {
      interval_days: nextInterval,
      next_review_at: nextReviewDate.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    });
  }
});
