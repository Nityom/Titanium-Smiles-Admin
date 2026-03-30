import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Consumables are just inventory items with is_consumable = true
export const list = query({
    args: {},
    handler: async (ctx) => {
        const inventory = await ctx.db.query("inventory").order("desc").collect();
        return inventory.filter((item) => item.is_consumable === true);
    },
});

export const recordUsage = mutation({
    args: {
        id: v.id("inventory"),
        quantity: v.number(),
    },
    handler: async (ctx, args) => {
        const item = await ctx.db.get(args.id);
        if (!item) throw new Error("Consumable not found");
        if (!item.is_consumable) throw new Error("Item is not a consumable");

        const newQuantity = Math.max(0, item.quantity - args.quantity);
        await ctx.db.patch(args.id, { quantity: newQuantity });
        return await ctx.db.get(args.id);
    },
});
