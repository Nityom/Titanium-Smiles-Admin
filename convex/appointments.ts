import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Check if a time slot is available
export const checkSlotAvailability = query({
  args: {
    appointment_date: v.string(),
    appointment_time: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) =>
        q.and(
          q.eq(q.field("appointment_time"), args.appointment_time),
          q.eq(q.field("doctor_name"), args.doctor_name || "Unassigned"),
          q.neq(q.field("status"), "CANCELLED")
        )
      )
      .first();

    return !existing; // Returns true if slot is available
  },
});

// Create a new appointment
export const create = mutation({
  args: {
    full_name: v.string(),
    phone: v.string(),
    appointment_date: v.string(),
    appointment_time: v.string(),
    doctor_name: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    dental_problem: v.string(),
    notes: v.optional(v.string()),
    reminder_note: v.optional(v.string()),
    reminder_minutes_before: v.optional(v.number()),
    is_offline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check slot availability
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) =>
        q.and(
          q.eq(q.field("appointment_time"), args.appointment_time),
          q.eq(q.field("doctor_name"), args.doctor_name || "Unassigned"),
          q.neq(q.field("status"), "CANCELLED")
        )
      )
      .first();

    if (existing) {
      throw new Error(`Time slot ${args.appointment_time} on ${args.appointment_date} is already booked`);
    }

    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      full_name: args.full_name,
      phone: args.phone,
      appointment_date: args.appointment_date,
      appointment_time: args.appointment_time,
      doctor_name: args.doctor_name || "Unassigned",
      duration_minutes: args.duration_minutes || 30,
      dental_problem: args.dental_problem,
      notes: args.notes || "",
      reminder_note: args.reminder_note || "",
      reminder_minutes_before: args.reminder_minutes_before ?? 30,
      status: "SCHEDULED",
      is_offline: args.is_offline || false,
      created_at: now,
      updated_at: now,
    });

    return appointmentId;
  },
});

// Get appointments by date (sorted by time)
export const getByDate = query({
  args: {
    appointment_date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) =>
        args.doctor_name
          ? q.and(
              q.neq(q.field("status"), "CANCELLED"),
              q.eq(q.field("doctor_name"), args.doctor_name)
            )
          : q.neq(q.field("status"), "CANCELLED")
      )
      .collect();

    // Sort by time
    return appointments.sort((a, b) => {
      return a.appointment_time.localeCompare(b.appointment_time);
    });
  },
});

export const getBookedSlots = query({
  args: {
    appointment_date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) =>
        args.doctor_name
          ? q.and(
              q.neq(q.field("status"), "CANCELLED"),
              q.eq(q.field("doctor_name"), args.doctor_name)
            )
          : q.neq(q.field("status"), "CANCELLED")
      )
      .collect();

    return appointments
      .map((appointment) => appointment.appointment_time)
      .sort((a, b) => a.localeCompare(b));
  },
});

// Get all appointments (paginated support)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) => q.neq(q.field("status"), "CANCELLED"))
      .collect();

    // Sort by date descending, then time descending
    return appointments
      .sort((a, b) => {
        const dateCompare = b.appointment_date.localeCompare(a.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return b.appointment_time.localeCompare(a.appointment_time);
      })
      .slice(0, limit);
  },
});

// Get appointment by ID
export const getById = query({
  args: {
    id: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get appointments by phone number
export const getByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .filter((q) => q.neq(q.field("status"), "CANCELLED"))
      .collect();

    // Sort by date descending
    return appointments.sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date)
    );
  },
});

// Update appointment
export const update = mutation({
  args: {
    id: v.id("appointments"),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    appointment_date: v.optional(v.string()),
    appointment_time: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    dental_problem: v.optional(v.string()),
    status: v.optional(v.union(v.literal("SCHEDULED"), v.literal("COMPLETED"), v.literal("CANCELLED"))),
    notes: v.optional(v.string()),
    reminder_note: v.optional(v.string()),
    reminder_minutes_before: v.optional(v.number()),
    is_offline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Appointment not found");
    }

    // If changing time slot, check availability
    const nextDate = args.appointment_date ?? existing.appointment_date;
    const nextTime = args.appointment_time ?? existing.appointment_time;
    const nextDoctor = args.doctor_name ?? existing.doctor_name ?? "Unassigned";

    if (
      nextDate !== existing.appointment_date ||
      nextTime !== existing.appointment_time ||
      nextDoctor !== (existing.doctor_name || "Unassigned")
    ) {
      const allAppointments = await ctx.db
        .query("appointments")
        .withIndex("by_date", (q) => q.eq("appointment_date", nextDate))
        .collect();

      const conflict = allAppointments.find((apt) =>
        apt.appointment_time === nextTime &&
        (apt.doctor_name || "Unassigned") === nextDoctor &&
        apt.status !== "CANCELLED" &&
        apt._id !== args.id
      );

      if (conflict) {
        throw new Error(
          `Time slot ${nextTime} on ${nextDate} is already booked for ${nextDoctor}`
        );
      }
    }

    const updateData: any = {
      updated_at: Date.now(),
    };

    if (args.full_name !== undefined) updateData.full_name = args.full_name;
    if (args.phone !== undefined) updateData.phone = args.phone;
    if (args.appointment_date !== undefined) updateData.appointment_date = args.appointment_date;
    if (args.appointment_time !== undefined) updateData.appointment_time = args.appointment_time;
    if (args.doctor_name !== undefined) updateData.doctor_name = args.doctor_name;
    if (args.duration_minutes !== undefined) updateData.duration_minutes = args.duration_minutes;
    if (args.dental_problem !== undefined) updateData.dental_problem = args.dental_problem;
    if (args.status !== undefined) updateData.status = args.status;
    if (args.notes !== undefined) updateData.notes = args.notes;
    if (args.reminder_note !== undefined) updateData.reminder_note = args.reminder_note;
    if (args.reminder_minutes_before !== undefined) updateData.reminder_minutes_before = args.reminder_minutes_before;
    if (args.is_offline !== undefined) updateData.is_offline = args.is_offline;

    await ctx.db.patch(args.id, updateData);
    return args.id;
  },
});

// Delete appointment (soft delete with CANCELLED status)
export const remove = mutation({
  args: {
    id: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Appointment not found");
    }

    await ctx.db.patch(args.id, {
      status: "CANCELLED",
      updated_at: Date.now(),
    });

    return args.id;
  },
});

// Get available time slots for a date (helper function)
export const getAvailableSlots = query({
  args: {
    appointment_date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Define standard time slots (30-minute intervals, 9 AM to 5 PM)
    const slots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00"
    ];

    const bookedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "CANCELLED"),
          q.eq(q.field("doctor_name"), args.doctor_name || "Unassigned")
        )
      )
      .collect();

    const bookedTimes = new Set(bookedAppointments.map((a) => a.appointment_time));

    return slots.filter((slot) => !bookedTimes.has(slot));
  },
});
