"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Appointment,
  createAppointment,
  deleteAppointment,
  getAllAppointments,
  getAvailableSlots,
  seedTestData,
  updateAppointment,
} from "@/services/appointments";
import {
  Reminder,
  createReminder,
  deleteReminder,
  getRemindersByDate,
} from "@/services/reminders";

type ViewMode = "day" | "week" | "month";

const ALL_TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
];

const REMINDER_OPTIONS = [0, 15, 30, 60, 120];
const DOCTOR_OPTIONS = [
  "Dr. Sindhuja Pandey",
  "Dr. Tarun Pandey",
  "Dr. Aman Ali",
  "Dr. Neha Sharma",
  "Unassigned",
];

const DOCTOR_COLOR_CLASSES = [
  {
    card: "bg-blue-100 border-blue-300 text-blue-900",
    dot: "bg-blue-600",
    line: "border-blue-400",
  },
  {
    card: "bg-sky-100 border-sky-300 text-sky-900",
    dot: "bg-sky-600",
    line: "border-sky-400",
  },
  {
    card: "bg-rose-100 border-rose-300 text-rose-900",
    dot: "bg-rose-600",
    line: "border-rose-400",
  },
  {
    card: "bg-violet-100 border-violet-300 text-violet-900",
    dot: "bg-violet-600",
    line: "border-violet-400",
  },
  {
    card: "bg-slate-100 border-slate-300 text-slate-900",
    dot: "bg-slate-600",
    line: "border-slate-400",
  },
];

const CALENDAR_START_MINUTES = 9 * 60;
const CALENDAR_END_MINUTES = 20 * 60;
const PIXELS_PER_MINUTE = 2.4;
const APPOINTMENT_VERTICAL_GAP = 12;
const FIXED_APPOINTMENT_DURATION_MINUTES = 30;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutesAsTime = (minutes: number) => {
  const safeMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${`${mins}`.padStart(2, "0")} ${suffix}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - day);
  return next;
};

const sameDay = (left: Date, right: Date) => toDateKey(left) === toDateKey(right);

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const monthTitleFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const calendarRangeLabel = (date: Date, viewMode: ViewMode) => {
  if (viewMode === "day") {
    return dayFormatter.format(date);
  }
  if (viewMode === "week") {
    const weekStart = startOfWeek(date);
    const weekEnd = addDays(weekStart, 6);
    return `${dayFormatter.format(weekStart)} - ${dayFormatter.format(weekEnd)}`;
  }
  return monthTitleFormatter.format(date);
};

const doctorPalette = (doctorName: string) => {
  const normalized = doctorName.trim().toLowerCase();

  if (normalized.includes("sindhuja")) return DOCTOR_COLOR_CLASSES[2];
  if (normalized.includes("tarun")) return DOCTOR_COLOR_CLASSES[0];
  if (normalized.includes("aman")) return DOCTOR_COLOR_CLASSES[2];
  if (normalized.includes("neha")) return DOCTOR_COLOR_CLASSES[3];

  return DOCTOR_COLOR_CLASSES[4];
};

const extractLegacyDoctor = (notes?: string) => {
  if (!notes) return undefined;
  const match = notes.match(/#doctor:\s*([^\n\r]+)/i);
  return match?.[1]?.trim();
};

const resolveDoctorName = (appointment: Appointment) => {
  return appointment.doctor_name || extractLegacyDoctor(appointment.notes) || DOCTOR_OPTIONS[0];
};

type LaneLayoutItem = {
  appointment: Appointment;
  start: number;
  end: number;
  column: number;
  columnsInGroup: number;
};

const buildLaneLayout = (appointments: Appointment[]): LaneLayoutItem[] => {
  const sorted = [...appointments]
    .map((appointment) => {
      const start = toMinutes(appointment.appointment_time);
      const duration = FIXED_APPOINTMENT_DURATION_MINUTES;
      return {
        appointment,
        start,
        end: start + duration,
      };
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });

  const columnsEnd: number[] = [];
  const assigned: Array<LaneLayoutItem & { group: number }> = [];

  for (const item of sorted) {
    let column = 0;
    while (column < columnsEnd.length && columnsEnd[column] > item.start) {
      column += 1;
    }
    columnsEnd[column] = item.end;

    assigned.push({
      ...item,
      column,
      group: -1,
      columnsInGroup: 1,
    });
  }

  let groupIndex = 0;
  let groupStart = 0;

  while (groupStart < assigned.length) {
    let groupEnd = groupStart;
    let maxEnd = assigned[groupStart].end;

    while (groupEnd + 1 < assigned.length && assigned[groupEnd + 1].start < maxEnd) {
      groupEnd += 1;
      maxEnd = Math.max(maxEnd, assigned[groupEnd].end);
    }

    const columnsInGroup =
      Math.max(...assigned.slice(groupStart, groupEnd + 1).map((x) => x.column)) + 1;

    for (let i = groupStart; i <= groupEnd; i += 1) {
      assigned[i].group = groupIndex;
      assigned[i].columnsInGroup = columnsInGroup;
    }

    groupIndex += 1;
    groupStart = groupEnd + 1;
  }

  return assigned;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(
    null,
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    appointment_date: toDateKey(new Date()),
    appointment_time: "",
    doctor_name: DOCTOR_OPTIONS[0],
    dental_problem: "",
    notes: "",
    status: "SCHEDULED" as "SCHEDULED" | "COMPLETED" | "CANCELLED",
    is_offline: false,
  });

  const [reminderFormData, setReminderFormData] = useState({
    reminder_date: toDateKey(new Date()),
    title: "",
    notes: "",
  });

  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (formData.appointment_date) {
      loadAvailableSlots(formData.appointment_date, formData.doctor_name);
    }
  }, [formData.appointment_date, formData.doctor_name]);

  useEffect(() => {
    loadReminders(selectedDateKey);
  }, [selectedDateKey]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getAllAppointments(500);
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (date: string, doctorName: string) => {
    try {
      const slots = await getAvailableSlots(date, doctorName);
      setAvailableSlots(slots);

      const allAppointments = await getAllAppointments(500);
      const bookedForDate = new Set(
        allAppointments
          .filter(
            (apt) =>
              apt.appointment_date === date &&
              apt.status !== "CANCELLED" &&
              resolveDoctorName(apt) === doctorName,
          )
          .map((apt) => apt.appointment_time),
      );
      setBookedSlots(bookedForDate);
    } catch (error) {
      console.error("Error loading available slots:", error);
    }
  };

  const handleOpenDialog = (appointment?: Appointment) => {
    if (appointment) {
      setIsEditMode(true);
      setSelectedAppointment(appointment);
      setFormData({
        full_name: appointment.full_name,
        phone: appointment.phone,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        doctor_name: resolveDoctorName(appointment),
        dental_problem: appointment.dental_problem,
        notes: appointment.notes || "",
        status: (appointment.status || "SCHEDULED") as
          | "SCHEDULED"
          | "COMPLETED"
          | "CANCELLED",
        is_offline: appointment.is_offline || false,
      });
    } else {
      setIsEditMode(false);
      setSelectedAppointment(null);
      setFormData({
        full_name: "",
        phone: "",
        appointment_date: toDateKey(selectedDate),
        appointment_time: "",
        doctor_name: DOCTOR_OPTIONS[0],
        dental_problem: "",
        notes: "",
        status: "SCHEDULED",
        is_offline: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.full_name ||
      !formData.phone ||
      !formData.appointment_time ||
      !formData.dental_problem ||
      !formData.doctor_name
    ) {
      return;
    }

    try {
      setLoading(true);
      if (isEditMode && selectedAppointment) {
        await updateAppointment(selectedAppointment._id, {
          full_name: formData.full_name,
          phone: formData.phone,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          doctor_name: formData.doctor_name,
          dental_problem: formData.dental_problem,
          notes: formData.notes,
          status: formData.status,
          is_offline: formData.is_offline,
        });
      } else {
        await createAppointment({
          full_name: formData.full_name,
          phone: formData.phone,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          doctor_name: formData.doctor_name,
          dental_problem: formData.dental_problem,
          notes: formData.notes,
          is_offline: formData.is_offline,
        });
      }
      setIsDialogOpen(false);
      await loadAppointments();
    } catch (error: unknown) {
      console.error("Failed to save appointment", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteAppointment(id);
      await loadAppointments();
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTestData = async () => {
    try {
      setLoading(true);
      await seedTestData();
      await loadAppointments();
    } catch (error: unknown) {
      console.error("Failed to seed test data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReminderDialog = (appointment?: Appointment) => {
    setReminderFormData({
      reminder_date: selectedDateKey,
      title: "",
      notes: "",
    });
    setIsReminderDialogOpen(true);
  };

  const loadReminders = async (date: string) => {
    try {
      const data = await getRemindersByDate(date);
      setReminders(data);
    } catch (error) {
      console.error("Error loading reminders:", error);
      setReminders([]);
    }
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reminderFormData.title) {
      return;
    }

    try {
      setLoading(true);
      await createReminder({
        reminder_date: reminderFormData.reminder_date,
        title: reminderFormData.title,
        notes: reminderFormData.notes,
      });
      setIsReminderDialogOpen(false);
      await loadReminders(selectedDateKey);
    } catch (error: unknown) {
      console.error("Failed to save reminder", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteReminder(id);
      await loadReminders(selectedDateKey);
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  const selectedDayAppointments = useMemo(
    () =>
      appointments
        .filter(
          (apt) =>
            apt.appointment_date === selectedDateKey && apt.status !== "CANCELLED",
        )
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments, selectedDateKey],
  );

  const reminderItems = useMemo(
    () => reminders,
    [reminders],
  );

  const todaySummary = useMemo(() => {
    const waiting = selectedDayAppointments.filter(
      (apt) => apt.status === "SCHEDULED",
    ).length;
    const engaged = selectedDayAppointments.filter(
      (apt) => apt.status === "COMPLETED",
    ).length;
    const walkin = selectedDayAppointments.filter((apt) => apt.is_offline).length;
    return {
      total: selectedDayAppointments.length,
      waiting,
      engaged,
      walkin,
    };
  }, [selectedDayAppointments]);

  const navigateDate = (direction: "prev" | "next") => {
    const delta = direction === "prev" ? -1 : 1;
    if (viewMode === "day") {
      setSelectedDate(addDays(selectedDate, delta));
      return;
    }
    if (viewMode === "week") {
      setSelectedDate(addDays(selectedDate, delta * 7));
      return;
    }
    const monthDate = new Date(selectedDate);
    monthDate.setMonth(monthDate.getMonth() + delta);
    setSelectedDate(monthDate);
  };

  const renderDayView = () => {
    const fullHeight =
      (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES) * PIXELS_PER_MINUTE;
    const laneLayout = buildLaneLayout(selectedDayAppointments);
    const doctorsInView = Array.from(
      new Set(selectedDayAppointments.map((apt) => resolveDoctorName(apt))),
    );

    return (
      <div className="calendar-scroll overflow-auto rounded-xl border border-gray-200 bg-white">
        <div
          className="min-w-[920px]"
          style={{
            display: "grid",
            gridTemplateColumns: "96px minmax(820px, 1fr)",
          }}
        >
          <div className="border-r border-gray-200 bg-gray-50 p-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Time
          </div>
          <div className="border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {doctorsInView.length === 0 ? (
                <span>Schedule</span>
              ) : (
                doctorsInView.map((doctor) => {
                  const palette = doctorPalette(doctor);
                  return (
                    <span key={doctor} className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
                      {doctor}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="relative border-r border-gray-200 bg-white"
            style={{ height: `${fullHeight}px` }}
          >
            {Array.from(
              {
                length:
                  Math.floor(
                    (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES) / 30,
                  ) + 1,
              },
              (_, index) => {
                const minutes = CALENDAR_START_MINUTES + index * 30;
                const top = (minutes - CALENDAR_START_MINUTES) * PIXELS_PER_MINUTE;
                return (
                  <div
                    key={minutes}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${top}px` }}
                  >
                    <span className="-mt-2 block pr-2 text-right text-[11px] text-[#70788a]">
                      {formatMinutesAsTime(minutes)}
                    </span>
                  </div>
                );
              },
            )}
          </div>

          <div
            className="relative border-r border-gray-200 bg-white"
            style={{ height: `${fullHeight}px` }}
          >
            {Array.from(
              {
                length:
                  Math.floor(
                    (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES) / 30,
                  ) + 1,
              },
              (_, index) => {
                const minutes = CALENDAR_START_MINUTES + index * 30;
                const top =
                  (minutes - CALENDAR_START_MINUTES) * PIXELS_PER_MINUTE;
                return (
                  <div
                    key={`slot-${minutes}`}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${top}px` }}
                  />
                );
              },
            )}

            {laneLayout.map((entry) => {
              const appointment = entry.appointment;
              const doctor = resolveDoctorName(appointment);
              const startMinutes = entry.start;
              const durationMinutes = FIXED_APPOINTMENT_DURATION_MINUTES;
              const blockTop =
                (startMinutes - CALENDAR_START_MINUTES) * PIXELS_PER_MINUTE;
              const blockHeight =
                Math.max(durationMinutes * PIXELS_PER_MINUTE - APPOINTMENT_VERTICAL_GAP, 34);
              const palette = doctorPalette(doctor);
              const leftPct = (entry.column / entry.columnsInGroup) * 100;
              const widthPct = 100 / entry.columnsInGroup;

              return (
                <button
                  key={appointment._id}
                  type="button"
                  className={`absolute overflow-hidden rounded-md border-l-4 p-2.5 text-left shadow-sm transition hover:shadow-md ${palette.card} ${palette.line}`}
                  style={{
                    left: `calc(${leftPct}% + 10px)`,
                    width: `calc(${widthPct}% - 20px)`,
                    top: `${Math.max(blockTop + APPOINTMENT_VERTICAL_GAP / 2, 0)}px`,
                    height: `${blockHeight}px`,
                  }}
                  onClick={() => handleOpenDialog(appointment)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{appointment.full_name}</p>
                      <p className="truncate text-[11px] opacity-80">{doctor}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="shrink-0 text-[11px] font-medium opacity-90">
                        {appointment.appointment_time}
                      </p>
                      <p className="truncate text-[11px] opacity-80">
                        {appointment.dental_problem}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {laneLayout.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                No appointments
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate);
    const weekDays = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));

    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const dayAppointments = appointments
            .filter((apt) => apt.appointment_date === key && apt.status !== "CANCELLED")
            .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

          return (
            <Card key={key} className="border-gray-200 bg-white p-3">
              <button
                type="button"
                className={`w-full rounded-md px-2 py-1 text-left text-sm font-semibold ${
                  sameDay(day, selectedDate)
                    ? "bg-blue-100 text-blue-800"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode("day");
                }}
              >
                {dayFormatter.format(day)}
              </button>

              <div className="mt-3 space-y-2">
                {dayAppointments.length === 0 && (
                  <p className="text-xs text-gray-400">No appointments</p>
                )}

                {dayAppointments.map((appointment) => {
                  const palette = doctorPalette(
                    resolveDoctorName(appointment),
                  );
                  return (
                    <button
                      key={appointment._id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(parseDateKey(appointment.appointment_date));
                        setViewMode("day");
                      }}
                      className={`w-full rounded-md border p-2 text-left text-xs ${palette.card}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">{appointment.full_name}</p>
                        <p className="shrink-0 opacity-90">{appointment.appointment_time}</p>
                      </div>
                      <p className="truncate opacity-80">
                        {resolveDoctorName(appointment)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const firstGridDay = startOfWeek(monthStart);
    const days = Array.from({ length: 42 }, (_, idx) => addDays(firstGridDay, idx));

    return (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
          {Array.from({ length: 7 }, (_, idx) => {
            const day = addDays(startOfWeek(new Date()), idx);
            return (
              <div key={idx} className="border-r border-gray-200 px-3 py-2 last:border-r-0">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDateKey(day);
            const dayAppointments = appointments
              .filter((apt) => apt.appointment_date === key && apt.status !== "CANCELLED")
              .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

            return (
              <button
                key={key}
                type="button"
                className={`min-h-[130px] border-b border-r border-gray-200 p-2 text-left align-top transition hover:bg-gray-50 ${
                  day.getMonth() !== selectedDate.getMonth()
                    ? "bg-gray-50/70 text-gray-400"
                    : "bg-white text-gray-700"
                }`}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode("day");
                }}
              >
                <p
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    sameDay(day, new Date())
                      ? "bg-blue-600 text-white"
                      : sameDay(day, selectedDate)
                        ? "bg-blue-100 text-blue-700"
                        : ""
                  }`}
                >
                  {day.getDate()}
                </p>
                <div className="mt-2 space-y-1">
                  {dayAppointments.map((appointment) => {
                    const palette = doctorPalette(
                      resolveDoctorName(appointment),
                    );
                    return (
                      <div
                        key={appointment._id}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${palette.card}`}
                      >
                        {appointment.appointment_time} {appointment.full_name}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 p-3">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointments Calendar</h1>
            <p className="text-gray-600">
              Day, week, and month scheduling with doctor-wise color lanes and reminders
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSeedTestData}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Seed Test Data
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus size={18} />
            New Appointment
          </Button>
        </div>
      </div>

      <Card className="border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("prev")}
              className="border-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate("next")}
              className="border-gray-300"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="border-gray-300"
            >
              Today
            </Button>
            <p className="ml-2 text-sm font-semibold text-gray-800">
              {calendarRangeLabel(selectedDate, viewMode)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={selectedDateKey}
              onChange={(e) => setSelectedDate(parseDateKey(e.target.value))}
              className="h-9 w-[180px] border-gray-300"
            />
            <div className="inline-flex rounded-lg border border-gray-300 p-1">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={viewMode === mode ? "default" : "ghost"}
                  onClick={() => setViewMode(mode)}
                  className={
                    viewMode === mode
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700"
                  }
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Day-wise Reminders ({dayFormatter.format(selectedDate)})
          </h2>
        </div>
        {reminderItems.length === 0 ? (
          <p className="text-sm text-gray-500">No reminders scheduled for this day.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {reminderItems.map((item) => {
              return (
                <div
                  key={item._id}
                  className="rounded-md border border-amber-300 bg-amber-100 p-3 text-xs text-amber-900"
                >
                  <p className="font-semibold">{item.title}</p>
                  {item.notes && <p className="mt-1 opacity-80">{item.notes}</p>}
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-medium text-red-700 underline"
                    onClick={() => handleDeleteReminder(item._id)}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          {loading ? (
            <Card className="border-gray-200 bg-white p-8 text-center text-gray-600">
              Loading appointments...
            </Card>
          ) : (
            <>
              {viewMode === "day" && renderDayView()}
              {viewMode === "week" && renderWeekView()}
              {viewMode === "month" && renderMonthView()}
            </>
          )}
        </div>

        <Card className="h-fit border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Today's Schedule</h3>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-100 p-2 text-slate-700">
              <p>Total</p>
              <p className="text-lg font-bold">{todaySummary.total}</p>
            </div>
            <div className="rounded-md bg-yellow-100 p-2 text-yellow-800">
              <p>Waiting</p>
              <p className="text-lg font-bold">{todaySummary.waiting}</p>
            </div>
            <div className="rounded-md bg-teal-100 p-2 text-teal-800">
              <p>Engaged</p>
              <p className="text-lg font-bold">{todaySummary.engaged}</p>
            </div>
            <div className="rounded-md bg-orange-100 p-2 text-orange-800">
              <p>Walk-in</p>
              <p className="text-lg font-bold">{todaySummary.walkin}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {selectedDayAppointments.length === 0 && (
              <p className="text-xs text-gray-500">No appointments for selected date.</p>
            )}

            {selectedDayAppointments.map((appointment) => {
              const palette = doctorPalette(resolveDoctorName(appointment));
              return (
                <div key={appointment._id} className={`w-full rounded-md border p-2 text-left text-xs ${palette.card}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{appointment.full_name}</p>
                    <p className="shrink-0 opacity-90">{appointment.appointment_time}</p>
                  </div>
                  <p className="opacity-80">{resolveDoctorName(appointment)}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-gray-300 bg-white/70 text-[11px]"
                      onClick={() => handleOpenDialog(appointment)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 border-red-300 bg-white/70 text-[11px] text-red-700"
                      onClick={() => {
                        setAppointmentToDelete(appointment._id);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .calendar-scroll {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        .calendar-scroll::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      `}</style>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl border-gray-300 bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update appointment details, duration, and doctor."
                : "Create appointment details first. Add reminder separately."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder="Patient name"
                  className="mt-1 border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Phone number"
                  className="mt-1 border-gray-300"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Date *</label>
                <Input
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      appointment_date: e.target.value,
                      appointment_time: "",
                    }))
                  }
                  className="mt-1 border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Doctor *</label>
                <Select
                  value={formData.doctor_name}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      doctor_name: value,
                      appointment_time: "",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-300">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 bg-white">
                    {DOCTOR_OPTIONS.map((doctor) => (
                      <SelectItem key={doctor} value={doctor} className="text-gray-900">
                        {doctor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Time *</label>
              {formData.is_offline ? (
                <>
                  <Input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        appointment_time: e.target.value,
                      }))
                    }
                    className="mt-1 border-gray-300"
                  />
                  <p className="mt-1 text-xs text-amber-700">
                    Walk-in mode allows custom time (example: 09:45).
                  </p>
                </>
              ) : (
                <Select
                  value={formData.appointment_time}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, appointment_time: value }))
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-300">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 bg-white">
                    {(availableSlots.length > 0 ? availableSlots : ALL_TIME_SLOTS).map(
                      (slot) => {
                        const isBooked = bookedSlots.has(slot);
                        return (
                          <SelectItem
                            key={slot}
                            value={slot}
                            disabled={isBooked}
                            className={
                              isBooked ? "text-red-600 opacity-60" : "text-gray-900"
                            }
                          >
                            {slot} {isBooked ? "(Booked)" : "(Available)"}
                          </SelectItem>
                        );
                      },
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Dental Problem *</label>
              <Input
                value={formData.dental_problem}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dental_problem: e.target.value }))
                }
                placeholder="e.g., Cavity, Cleaning, Root Canal"
                className="mt-1 border-gray-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Additional notes"
                className="mt-1 border-gray-300"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 py-1">
              <Checkbox
                id="offline"
                checked={formData.is_offline}
                onCheckedChange={(checked) => {
                  const isOffline = checked === true;
                  setFormData((prev) => {
                    const next = { ...prev, is_offline: isOffline };
                    if (!isOffline && !ALL_TIME_SLOTS.includes(prev.appointment_time)) {
                      next.appointment_time = "";
                    }
                    return next;
                  });
                }}
                className="border-gray-300"
              />
              <label
                htmlFor="offline"
                className="cursor-pointer text-sm font-medium text-gray-700"
              >
                Walk-in / Offline Appointment
              </label>
            </div>

            {isEditMode && (
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "SCHEDULED" | "COMPLETED" | "CANCELLED") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="mt-1 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-300 bg-white">
                    <SelectItem value="SCHEDULED" className="text-gray-900">
                      Scheduled
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-gray-900">
                      Completed
                    </SelectItem>
                    <SelectItem value="CANCELLED" className="text-gray-900">
                      Cancelled
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-md border-gray-300 bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              Set reminder timing and note from a separate reminder flow.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveReminder} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Reminder Date</label>
              <Input
                type="date"
                value={reminderFormData.reminder_date}
                onChange={(e) =>
                  setReminderFormData((prev) => ({
                    ...prev,
                    reminder_date: e.target.value,
                  }))
                }
                className="mt-1 border-gray-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Reminder Title</label>
              <Input
                value={reminderFormData.title}
                onChange={(e) =>
                  setReminderFormData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g. Call supplier, Team huddle"
                className="mt-1 border-gray-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <Input
                value={reminderFormData.notes}
                onChange={(e) =>
                  setReminderFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Optional details"
                className="mt-1 border-gray-300"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReminderDialogOpen(false)}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
              >
                {loading ? "Saving..." : "Save Reminder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-gray-300 bg-white">
          <AlertDialogTitle className="text-gray-900">
            Cancel Appointment?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            This action cannot be undone. The appointment will be marked as cancelled.
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-100">
              Keep
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => appointmentToDelete && handleDelete(appointmentToDelete)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? "Cancelling..." : "Cancel Appointment"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}