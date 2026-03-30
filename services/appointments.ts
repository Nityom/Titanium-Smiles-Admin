import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface Appointment {
  _id: string;
  full_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  dental_problem: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  is_offline?: boolean;
  created_at: number;
  updated_at: number;
}

export const createAppointment = async (data: {
  full_name: string;
  phone: string;
  appointment_date: string;
  appointment_time: string;
  dental_problem: string;
  notes?: string;
  is_offline?: boolean;
}) => {
  const appointmentId = await convex.mutation(api.appointments.create, {
    full_name: data.full_name,
    phone: data.phone,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    dental_problem: data.dental_problem,
    notes: data.notes || "",
    is_offline: data.is_offline || false,
  });
  return appointmentId;
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
  const data = await convex.query("appointments:getById" as any, {
    id: id as any,
  });
  return data || null;
};

export const updateAppointment = async (
  id: string,
  updates: Partial<Omit<Appointment, "_id" | "created_at" | "updated_at">>
) => {
  return await convex.mutation("appointments:update" as any, {
    id: id as any,
    ...updates,
  } as any);
};

export const deleteAppointment = async (id: string) => {
  return await convex.mutation("appointments:remove" as any, {
    id: id as any,
  } as any);
};

export const checkSlotAvailability = async (
  appointmentDate: string,
  appointmentTime: string
): Promise<boolean> => {
  const isAvailable = await convex.query(
    api.appointments.checkSlotAvailability,
    {
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
    }
  );
  return isAvailable;
};

export const getAvailableSlots = async (
  appointmentDate: string
): Promise<string[]> => {
  const slots = await convex.query(api.appointments.getAvailableSlots, {
    appointment_date: appointmentDate,
  });
  return slots;
};

export const seedTestData = async () => {
  return await convex.mutation(api.appointments.seedTestData, {});
};
