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
  },
  handler: async (ctx, args) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .filter((q) => q.neq(q.field("status"), "CANCELLED"))
      .collect();

    // Sort by time
    return appointments.sort((a, b) => {
      return a.appointment_time.localeCompare(b.appointment_time);
    });
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

// Seed test data
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const today = new Date();
    
    const testData = [
      // Today's appointments
      {
        full_name: "Rajesh Kumar",
        phone: "+91-9876543210",
        appointment_date: today.toISOString().split("T")[0],
        appointment_time: "09:00",
        doctor_name: "Dr. Tarun Pandey",
        duration_minutes: 30,
        dental_problem: "Regular Checkup",
        notes: "First time patient",
        reminder_note: "Confirm consent form",
        reminder_minutes_before: 30,
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Priya Singh",
        phone: "+91-9876543211",
        appointment_date: today.toISOString().split("T")[0],
        appointment_time: "09:30",
        doctor_name: "Dr. Sindhuja Pandey",
        duration_minutes: 45,
        dental_problem: "Cavity Filling",
        notes: "Previous filling replacement",
        reminder_note: "Prepare filling kit",
        reminder_minutes_before: 15,
        status: "COMPLETED" as const,
      },
      {
        full_name: "Amit Patel",
        phone: "+91-9876543212",
        appointment_date: today.toISOString().split("T")[0],
        appointment_time: "10:00",
        doctor_name: "Dr. Tarun Pandey",
        duration_minutes: 60,
        dental_problem: "Root Canal",
        notes: "Emergency appointment",
        reminder_note: "Set x-ray station",
        reminder_minutes_before: 30,
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Neha Desai",
        phone: "+91-9876543213",
        appointment_date: today.toISOString().split("T")[0],
        appointment_time: "14:00",
        doctor_name: "Dr. Sindhuja Pandey",
        duration_minutes: 30,
        dental_problem: "Teeth Cleaning",
        notes: "Regular maintenance",
        reminder_note: "Keep polishing setup ready",
        reminder_minutes_before: 30,
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Vikram Rao",
        phone: "+91-9876543214",
        appointment_date: today.toISOString().split("T")[0],
        appointment_time: "15:00",
        doctor_name: "Dr. Tarun Pandey",
        duration_minutes: 30,
        dental_problem: "Braces Adjustment",
        notes: "Monthly checkup",
        reminder_note: "Sterilize braces tools",
        reminder_minutes_before: 15,
        status: "SCHEDULED" as const,
      },
      
      // Tomorrow's appointments
      {
        full_name: "Anjali Nair",
        phone: "+91-9876543215",
        appointment_date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "10:30",
        doctor_name: "Dr. Sindhuja Pandey",
        duration_minutes: 60,
        dental_problem: "Wisdom Tooth Extraction",
        notes: "Pre-extraction consultation done",
        reminder_note: "Arrange extraction tray",
        reminder_minutes_before: 60,
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Rohan Verma",
        phone: "+91-9876543216",
        appointment_date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "11:00",
        doctor_name: "Dr. Tarun Pandey",
        duration_minutes: 45,
        dental_problem: "Gum Disease Treatment",
        notes: "Second session",
        reminder_note: "Review prior periodontal chart",
        reminder_minutes_before: 30,
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Shruti Sharma",
        phone: "+91-9876543217",
        appointment_date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "13:30",
        dental_problem: "Whitening Treatment",
        notes: "Cosmetic procedure",
        status: "SCHEDULED" as const,
      },
      
      // Day after tomorrow
      {
        full_name: "Karun Das",
        phone: "+91-9876543218",
        appointment_date: new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "09:30",
        dental_problem: "Implant Consultation",
        notes: "Initial assessment",
        status: "SCHEDULED" as const,
      },
      {
        full_name: "Divya Iyer",
        phone: "+91-9876543219",
        appointment_date: new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "14:30",
        dental_problem: "Bridge Fitting",
        notes: "Final fitting",
        status: "SCHEDULED" as const,
      },
      
      // Some cancelled and completed appointments
      {
        full_name: "Harsh Gupta",
        phone: "+91-9876543220",
        appointment_date: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "11:00",
        dental_problem: "Scaling",
        notes: "Completed successfully",
        status: "COMPLETED" as const,
      },
      {
        full_name: "Meera Chopra",
        phone: "+91-9876543221",
        appointment_date: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        appointment_time: "15:00",
        dental_problem: "Crown Placement",
        notes: "Patient cancelled",
        status: "CANCELLED" as const,
      },
    ];

    const createdIds: string[] = [];
    for (const appointment of testData) {
      const id = await ctx.db.insert("appointments", {
        full_name: appointment.full_name,
        phone: appointment.phone,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        dental_problem: appointment.dental_problem,
        notes: appointment.notes,
        status: appointment.status,
        created_at: now,
        updated_at: now,
      });
      createdIds.push(id);
    }

    return {
      success: true,
      count: createdIds.length,
      message: `Created ${createdIds.length} test appointments`,
    };
  },
});
