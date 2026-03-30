import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByDate = query({
  args: {
    reminder_date: v.string(),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_date", (q) => q.eq("reminder_date", args.reminder_date))
      .collect();

    return reminders.sort((a, b) => b.created_at - a.created_at);
  },
});

export const create = mutation({
  args: {
    reminder_date: v.string(),
    title: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("reminders", {
      reminder_date: args.reminder_date,
      title: args.title,
      notes: args.notes || "",
      created_at: now,
      updated_at: now,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Reminder not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
