import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all accounts
export const getAccounts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("accounts").order("name").collect();
  },
});

// Add new account
export const addAccount = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("accounts", {
      name: args.name,
      createdAt: Date.now(),
    });
  },
});
