import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new patient
export const create = mutation({
    args: {
        name: v.string(),
        age: v.string(),
        sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
        phone_number: v.string(),
        address: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if patient exists with this phone number
        const existingPatient = await ctx.db
            .query("patients")
            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
            .first();

        if (existingPatient) {
            return existingPatient._id;
        }

        // Get next reference number
        let counter = await ctx.db
            .query("reference_counter")
            .withIndex("by_counter_id", (q) => q.eq("counter_id", 1))
            .first();
        let currentNumber = 0;
        if (counter) {
            currentNumber = counter.current_number;
            await ctx.db.patch(counter._id, { current_number: currentNumber + 1 });
        } else {
            await ctx.db.insert("reference_counter", { counter_id: 1, current_number: 1 });
        }
        const reference_number = `TS${String(currentNumber + 1).padStart(4, "0")}`;

        const newPatientId = await ctx.db.insert("patients", {
            reference_number,
            name: args.name,
            age: args.age,
            sex: args.sex,
            phone_number: args.phone_number,
            address: args.address,
        });
        return newPatientId;
    },
});

export const getByPhoneNumber = query({
    args: { phone_number: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patients")
            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
            .first();
    },
});

export const getById = query({
    args: { id: v.id("patients") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const getByReference = query({
    args: { reference_number: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("patients")
            .withIndex("by_reference", (q) => q.eq("reference_number", args.reference_number))
            .first();
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("patients").order("desc").collect();
    },
});

export const search = query({
    args: { searchTerm: v.string() },
    handler: async (ctx, args) => {
        const term = args.searchTerm.toLowerCase();
        const allPatients = await ctx.db.query("patients").collect();
        // In-memory search is okay for small db, but normally we'd use full text search
        return allPatients.filter((p) =>
            p.name.toLowerCase().includes(term) ||
            p.phone_number.includes(term) ||
            p.reference_number.toLowerCase().includes(term)
        );
    },
});

export const update = mutation({
    args: {
        id: v.id("patients"),
        name: v.optional(v.string()),
        age: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        phone_number: v.optional(v.string()),
        address: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("patients") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// One-time migration: rename all KS-prefixed reference numbers to TS
export const migrateKsToTs = mutation({
    args: {},
    handler: async (ctx) => {
        const patients = await ctx.db.query("patients").collect();
        let updated = 0;

        for (const patient of patients) {
            if (!patient.reference_number.startsWith("KS")) continue;

            const newRef = "TS" + patient.reference_number.slice(2);

            // Update patient
            await ctx.db.patch(patient._id, { reference_number: newRef });

            // Update all prescriptions with this reference number
            const prescriptions = await ctx.db
                .query("prescriptions")
                .collect();
            for (const rx of prescriptions) {
                if (rx.reference_number === patient.reference_number) {
                    await ctx.db.patch(rx._id, { reference_number: newRef });
                }
            }

            // Update all bills with this reference number
            const allBills = await ctx.db.query("bills").collect();
            for (const bill of allBills) {
                if (bill.reference_number === patient.reference_number) {
                    await ctx.db.patch(bill._id, { reference_number: newRef });
                }
            }

            updated++;
        }

        return { updated };
    },
});
