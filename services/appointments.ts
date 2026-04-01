import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);
type ConvexMutationRef = Parameters<ConvexHttpClient["mutation"]>[0];
type ConvexQueryRef = Parameters<ConvexHttpClient["query"]>[0];

const hasExtraFieldValidationError = (error: unknown, fieldName: string) => {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ArgumentValidationError") &&
    error.message.includes(`extra field \`${fieldName}\``)
  );
};

const withLegacyDoctorTag = (notes: string | undefined, doctorName: string | undefined) => {
  const base = notes || "";
  const withoutOldTag = base
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("#doctor:"))
    .join("\n")
    .trim();

  if (!doctorName) return withoutOldTag;
  if (!withoutOldTag) return `#doctor: ${doctorName}`;
  return `${withoutOldTag}\n#doctor: ${doctorName}`;
};

export interface Appointment {
  _id: string;
  full_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name?: string;
  duration_minutes?: number;
  dental_problem: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  reminder_note?: string;
  reminder_minutes_before?: number;
  is_offline?: boolean;
  created_at: number;
  updated_at: number;
}

export const createAppointment = async (data: {
  full_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name?: string;
  duration_minutes?: number;
  dental_problem: string;
  notes?: string;
  reminder_note?: string;
  reminder_minutes_before?: number;
  is_offline?: boolean;
}) => {
  const fullPayload = {
    full_name: data.full_name,
    phone: data.phone,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    doctor_name: data.doctor_name || "Unassigned",
    duration_minutes: data.duration_minutes || 30,
    dental_problem: data.dental_problem,
    notes: data.notes || "",
    reminder_note: data.reminder_note || "",
    reminder_minutes_before: data.reminder_minutes_before ?? 30,
    is_offline: data.is_offline || false,
  };

  try {
    return await convex.mutation(
      "appointments:create" as unknown as ConvexMutationRef,
      fullPayload as Record<string, unknown>,
    );
  } catch (error) {
    // Backward compatibility with older deployed Convex validators.
    if (hasExtraFieldValidationError(error, "doctor_name")) {
      return await convex.mutation(
        "appointments:create" as unknown as ConvexMutationRef,
        {
          full_name: data.full_name,
          phone: data.phone,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          dental_problem: data.dental_problem,
          notes: withLegacyDoctorTag(data.notes, data.doctor_name || "Unassigned"),
          is_offline: data.is_offline || false,
        } as Record<string, unknown>,
      );
    }
    throw error;
  }
};

export const getAppointmentsByDate = async (
  appointmentDate: string
): Promise<Appointment[]> => {
  const data = await convex.query(api.appointments.getByDate, {
    appointment_date: appointmentDate,
  });
  return data;
};

export const getAppointmentsByPhone = async (
  phone: string
): Promise<Appointment[]> => {
  const data = await convex.query(api.appointments.getByPhone, {
    phone,
  });
  return data;
};

export const getAllAppointments = async (limit?: number): Promise<Appointment[]> => {
  const data = await convex.query(api.appointments.list, {
    limit: limit || 50,
  });
  return data;
};

export const getAppointmentById = async (
  id: string
): Promise<Appointment | null> => {
  const data = await convex.query("appointments:getById" as unknown as ConvexQueryRef, {
    id,
  } as Record<string, unknown>);
  return data || null;
};

export const updateAppointment = async (
  id: string,
  updates: Partial<Omit<Appointment, "_id" | "created_at" | "updated_at">>
) => {
  try {
    return await convex.mutation("appointments:update" as unknown as ConvexMutationRef, {
      id,
      ...updates,
    } as Record<string, unknown>);
  } catch (error) {
    if (hasExtraFieldValidationError(error, "doctor_name")) {
      const {
        doctor_name: _doctorName,
        duration_minutes: _durationMinutes,
        reminder_note: _reminderNote,
        reminder_minutes_before: _reminderMinutesBefore,
        ...legacyUpdates
      } = updates;

      return await convex.mutation("appointments:update" as unknown as ConvexMutationRef, {
        id,
        ...legacyUpdates,
        notes: withLegacyDoctorTag(
          typeof legacyUpdates.notes === "string" ? legacyUpdates.notes : undefined,
          updates.doctor_name,
        ),
      } as Record<string, unknown>);
    }
    throw error;
  }
};

export const deleteAppointment = async (id: string) => {
  return await convex.mutation("appointments:remove" as unknown as ConvexMutationRef, {
    id,
  } as Record<string, unknown>);
};

export const checkSlotAvailability = async (
  appointmentDate: string,
  appointmentTime: string,
  doctorName?: string
): Promise<boolean> => {
  try {
    return await convex.query("appointments:checkSlotAvailability" as unknown as ConvexQueryRef, {
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      doctor_name: doctorName || "Unassigned",
    } as Record<string, unknown>);
  } catch (error) {
    if (hasExtraFieldValidationError(error, "doctor_name")) {
      return await convex.query("appointments:checkSlotAvailability" as unknown as ConvexQueryRef, {
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      } as Record<string, unknown>);
    }
    throw error;
  }
};

export const getAvailableSlots = async (
  appointmentDate: string,
  doctorName?: string
): Promise<string[]> => {
  try {
    return await convex.query("appointments:getAvailableSlots" as unknown as ConvexQueryRef, {
      appointment_date: appointmentDate,
      doctor_name: doctorName || "Unassigned",
    } as Record<string, unknown>);
  } catch (error) {
    if (hasExtraFieldValidationError(error, "doctor_name")) {
      return await convex.query("appointments:getAvailableSlots" as unknown as ConvexQueryRef, {
        appointment_date: appointmentDate,
      } as Record<string, unknown>);
    }
    throw error;
  }
};

