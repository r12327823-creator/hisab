import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all entries with account info
export const getEntries = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let entries = await ctx.db.query("entries").order("createdAt").reverse().collect();

    // Filter by date if provided
    if (args.startDate) {
      const start = new Date(args.startDate + "T00:00:00").getTime();
      entries = entries.filter((e) => e.createdAt >= start);
    }
    if (args.endDate) {
      const end = new Date(args.endDate + "T23:59:59").getTime();
      entries = entries.filter((e) => e.createdAt <= end);
    }

    // Add account name to each entry
    const entriesWithAccount = await Promise.all(
      entries.map(async (entry) => {
        const account = await ctx.db.get(entry.accountId);
        return { ...entry, accountName: account?.name || "Unknown" };
      })
    );

    return entriesWithAccount;
  },
});

// Add entry
export const addEntry = mutation({
  args: {
    accountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(v.literal("deposit"), v.literal("withdrawal")),
    description: v.optional(v.string()),
    utrNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("entries", {
      accountId: args.accountId,
      amount: args.amount,
      type: args.type,
      description: args.description,
      utrNumber: args.utrNumber,
      createdAt: Date.now(),
    });
  },
});

// Update entry
export const updateEntry = mutation({
  args: {
    id: v.id("entries"),
    amount: v.number(),
    description: v.optional(v.string()),
    utrNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      amount: args.amount,
      description: args.description,
      utrNumber: args.utrNumber,
    });
  },
});
