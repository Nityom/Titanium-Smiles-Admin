import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}

const convex = new ConvexHttpClient(convexUrl);
type ConvexMutationRef = Parameters<ConvexHttpClient["mutation"]>[0];
type ConvexQueryRef = Parameters<ConvexHttpClient["query"]>[0];

export interface Reminder {
  _id: string;
  reminder_date: string;
  title: string;
  notes?: string;
  created_at: number;
  updated_at: number;
}

export const getRemindersByDate = async (date: string): Promise<Reminder[]> => {
  const data = await convex.query(
    "reminders:listByDate" as unknown as ConvexQueryRef,
    {
      reminder_date: date,
    } as Record<string, unknown>,
  );
  return data as Reminder[];
};

export const createReminder = async (payload: {
  reminder_date: string;
  title: string;
  notes?: string;
}) => {
  return await convex.mutation(
    "reminders:create" as unknown as ConvexMutationRef,
    {
      reminder_date: payload.reminder_date,
      title: payload.title,
      notes: payload.notes || "",
    } as Record<string, unknown>,
  );
};

export const deleteReminder = async (id: string) => {
  return await convex.mutation(
    "reminders:remove" as unknown as ConvexMutationRef,
    {
      id,
    } as Record<string, unknown>,
  );
};
