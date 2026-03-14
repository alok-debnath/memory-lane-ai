import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    timezone: v.optional(v.string()),
    clerkId: v.optional(v.string()), // Assuming Auth is handled externally like Clerk or similar
  }).index("by_clerkId", ["clerkId"]),

  memory_notes: defineTable({
    user_id: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    reminder_date: v.optional(v.string()), // ISO string
    is_recurring: v.boolean(),
    recurrence_type: v.optional(v.string()),
    mood: v.optional(v.string()),
    capsule_unlock_date: v.optional(v.string()), // ISO string
    extracted_actions: v.optional(v.array(v.any())),
    tags: v.optional(v.array(v.string())),
    people: v.optional(v.array(v.string())),
    locations: v.optional(v.array(v.string())),
    importance: v.optional(v.string()),
    life_area: v.optional(v.string()),
    context_tags: v.optional(v.any()), // JSON object equivalent
    sentiment_score: v.optional(v.number()),
    linked_urls: v.optional(v.array(v.string())),
    embedding: v.optional(v.array(v.number())), // For semantic search
  }).index("by_user", ["user_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // Adjust based on model, Gemini typically 768 or OpenAI 1536
      filterFields: ["user_id"],
    }),

  diary_entries: defineTable({
    user_id: v.id("users"),
    raw_text: v.string(),
    corrected_text: v.optional(v.string()),
    mood: v.optional(v.string()),
    energy_level: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    structured_insights: v.optional(v.any()),
    habits_detected: v.optional(v.any()),
    personality_traits: v.optional(v.any()),
  }).index("by_user", ["user_id"]),

  memory_attachments: defineTable({
    user_id: v.id("users"),
    memory_id: v.id("memory_notes"),
    file_name: v.string(),
    file_path: v.string(),
    file_size: v.optional(v.number()),
    file_type: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex native storage
  }).index("by_memory", ["memory_id"])
    .index("by_user", ["user_id"]),

  document_extractions: defineTable({
    user_id: v.id("users"),
    memory_id: v.id("memory_notes"),
    attachment_id: v.id("memory_attachments"),
    extracted_text: v.string(),
    document_type: v.optional(v.string()),
    key_details: v.optional(v.any()),
    expiry_date: v.optional(v.string()),
    embedding: v.optional(v.array(v.number())),
  }).index("by_memory", ["memory_id"])
    .index("by_user", ["user_id"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["user_id"],
    }),

  ai_nudges: defineTable({
    user_id: v.id("users"),
    title: v.string(),
    message: v.string(),
    nudge_type: v.string(),
    priority: v.string(),
    based_on: v.optional(v.any()),
    is_acted_on: v.boolean(),
    is_dismissed: v.boolean(),
    expires_at: v.optional(v.string()),
  }).index("by_user", ["user_id"]),

  review_schedule: defineTable({
    user_id: v.id("users"),
    memory_id: v.id("memory_notes"),
    next_review_at: v.string(),
    last_reviewed_at: v.optional(v.string()),
    interval_days: v.number(),
    ease_factor: v.number(),
    repetitions: v.number(),
  }).index("by_user", ["user_id"])
    .index("by_memory", ["memory_id"]),
});
