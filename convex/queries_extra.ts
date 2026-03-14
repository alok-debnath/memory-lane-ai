import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDocuments = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("document_extractions")
      .withIndex("by_user" as any)
      .order("desc")
      .collect();
  },
});

export const getReviewSchedule = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const schedules = await ctx.db.query("review_schedule")
      .withIndex("by_user", q => q.eq("user_id", args.userId))
      .order("asc") // Order by next review date naturally
      .collect();

    // Join memory data
    return await Promise.all(schedules.map(async (s) => ({
      ...s,
      memory: await ctx.db.get(s.memory_id)
    })));
  },
});

export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memories = await ctx.db.query("memory_notes")
      .withIndex("by_user", q => q.eq("user_id", args.userId))
      .collect();

    const categoriesCount: Record<string, number> = {};
    const moodsCount: Record<string, number> = {};

    for (const m of memories) {
      if (m.category) {
        categoriesCount[m.category] = (categoriesCount[m.category] || 0) + 1;
      }
      if (m.mood) {
        moodsCount[m.mood] = (moodsCount[m.mood] || 0) + 1;
      }
    }

    return {
      totalMemories: memories.length,
      categoriesCount,
      moodsCount,
    };
  },
});
