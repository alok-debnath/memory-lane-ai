import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const processMemoryVoice = action({
  args: {
    userId: v.id("users"),
    transcription: v.string()
  },
  handler: async (ctx, args) => {
    // Simulated AI API Call since we don't have the explicit lovable endpoint key
    // You would replace this with actual fetch to Lovable AI Gateway
    const response = {
      title: "Extracted: " + args.transcription.substring(0, 15),
      content: args.transcription,
      category: "personal",
      mood: "neutral",
      tags: ["voice"],
    };

    // Store in the database
    await ctx.runMutation(internal.mutations.addMemory, {
      userId: args.userId,
      title: response.title,
      content: response.content,
      category: response.category,
      mood: response.mood,
      tags: response.tags,
      is_recurring: false,
    });

    return response;
  },
});

export const memoryChat = action({
  args: {
    userId: v.id("users"),
    message: v.string(),
    history: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Basic pseudo implementation mimicking tool-calling memory-chat
    // A real implementation would query memories here as a tool and use fetch to LLM.
    console.log("Processing chat for", args.userId);
    return {
      reply: "I am your AI assistant. I can see you said: " + args.message,
    };
  }
});

export const semanticSearchMemories = action({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Example pseudo code for semantic search.
    // 1. Convert args.query to an embedding using an embedding provider (OpenAI / Gemini)
    // const embedding = await fetchEmbedding(args.query);
    // 2. Perform vector search:
    // const results = await ctx.vectorSearch("memory_notes", "by_embedding", {
    //   vector: embedding,
    //   limit: 10,
    //   filter: (q) => q.eq("user_id", args.userId)
    // });

    // For now we just return an empty array indicating it needs API key config.
    return [];
  }
});
