import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  accounts: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }),

  entries: defineTable({
    accountId: v.id("accounts"),
    amount: v.number(),
    type: v.union(v.literal("deposit"), v.literal("withdrawal")),
    description: v.optional(v.string()),
    utrNumber: v.optional(v.string()),
    createdAt: v.number(),
  }),
});
