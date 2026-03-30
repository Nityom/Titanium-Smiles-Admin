import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
    args: {
        inventory_id: v.optional(v.string()),
        inventory_name: v.string(),
        quantity: v.number(),
        rate: v.number(),
        total_amount: v.number(),
        notes: v.optional(v.string()),
        sale_date: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("inventory_sales", {
            inventory_id: args.inventory_id,
            inventory_name: args.inventory_name,
            quantity: args.quantity,
            rate: args.rate,
            total_amount: args.total_amount,
            notes: args.notes,
            sale_date: args.sale_date,
        });
    },
});

export const listByDate = query({
    args: { sale_date: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("inventory_sales")
            .withIndex("by_sale_date", (q) => q.eq("sale_date", args.sale_date))
            .order("desc")
            .collect();
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("inventory_sales")
            .order("desc")
            .collect();
    },
});

export const listByDateRange = query({
    args: {
        start_date: v.string(),
        end_date: v.string(),
    },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("inventory_sales")
            .withIndex("by_sale_date")
            .order("desc")
            .collect();
        return all.filter(
            (s) => s.sale_date >= args.start_date && s.sale_date <= args.end_date
        );
    },
});
