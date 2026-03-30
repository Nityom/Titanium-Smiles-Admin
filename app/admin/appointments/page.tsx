"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, Plus, Edit2, Trash2, Eye } from "lucide-react";
import {
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailableSlots,
  seedTestData,
  Appointment,
} from "@/services/appointments";

export default function AppointmentsPage() {
  const allTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
  ];

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    appointment_date: new Date().toISOString().split("T")[0],
    appointment_time: "",
    dental_problem: "",
    notes: "",
    status: "SCHEDULED" as "SCHEDULED" | "COMPLETED" | "CANCELLED",
    is_offline: false,
  });

  // Fetch appointments on mount
  useEffect(() => {
    loadAppointments();
  }, []);

  // Fetch available slots when date changes
  useEffect(() => {
    if (formData.appointment_date) {
      loadAvailableSlots(formData.appointment_date);
    }
  }, [formData.appointment_date]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getAllAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Error loading appointments:", error);
      alert("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (date: string) => {
    try {
      const slots = await getAvailableSlots(date);
      setAvailableSlots(slots);
      // Get all appointments for this date to track booked slots
      const allAppointments = await getAllAppointments();
      const bookedForDate = new Set(
        allAppointments
          .filter((apt) => apt.appointment_date === date && apt.status !== "CANCELLED")
          .map((apt) => apt.appointment_time)
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
        dental_problem: appointment.dental_problem,
        notes: appointment.notes || "",
        status: (appointment.status || "SCHEDULED") as "SCHEDULED" | "COMPLETED" | "CANCELLED",
        is_offline: (appointment as any).is_offline || false,
      });
    } else {
      setIsEditMode(false);
      setSelectedAppointment(null);
      setFormData({
        full_name: "",
        phone: "",
        appointment_date: new Date().toISOString().split("T")[0],
        appointment_time: "",
        dental_problem: "",
        notes: "",
        status: "SCHEDULED" as "SCHEDULED" | "COMPLETED" | "CANCELLED",
        is_offline: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.phone || !formData.appointment_time || !formData.dental_problem) {
      alert("Please fill in all required fields");
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
          dental_problem: formData.dental_problem,
          notes: formData.notes,
          status: formData.status,
          is_offline: formData.is_offline,
        } as any);
        alert("Appointment updated successfully");
      } else {
        await createAppointment({
          full_name: formData.full_name,
          phone: formData.phone,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          dental_problem: formData.dental_problem,
          notes: formData.notes,
          is_offline: formData.is_offline,
        });
        alert("Appointment created successfully");
      }
      setIsDialogOpen(false);
      loadAppointments();
    } catch (error: any) {
      alert(error.message || "Failed to save appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteAppointment(id);
      alert("Appointment cancelled successfully");
      loadAppointments();
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      alert("Failed to cancel appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTestData = async () => {
    if (window.confirm("This will add 12 test appointments. Continue?")) {
      try {
        setLoading(true);
        const result = await seedTestData();
        alert(result.message);
        loadAppointments();
      } catch (error: any) {
        alert(error.message || "Failed to seed test data");
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredAppointments = appointments.filter(
    (apt) => apt.appointment_date === selectedDate && apt.status !== "CANCELLED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
                  <p className="text-gray-600">Manage patient appointments</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSeedTestData}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Seed Test Data
                </Button>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2"
                >
                  <Plus size={20} />
                  New Appointment
                </Button>
              </div>
            </div>
          </div>

          {/* Date Filter */}
          <Card className="bg-white border-gray-200">
            <div className="p-4">
              <label className="text-gray-700 text-sm font-medium">Filter by Date:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2 max-w-xs bg-white border-gray-300 text-gray-900"
              />
            </div>
          </Card>

          {/* Appointments Table */}
          {loading ? (
            <Card className="bg-white border-gray-200 p-8 text-center">
              <p className="text-gray-600">Loading appointments...</p>
            </Card>
          ) : filteredAppointments.length === 0 ? (
            <Card className="bg-white border-gray-200 p-8 text-center">
              <p className="text-gray-600">No appointments scheduled for {selectedDate}</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAppointments
                .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                .map((appointment) => (
                  <Card
                    key={appointment._id}
                    className="bg-white border-gray-200 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div>
                          <p className="text-gray-600 text-sm">Time</p>
                          <p className="text-gray-900 font-semibold text-lg">{appointment.appointment_time}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Patient Name</p>
                          <p className="text-gray-900 font-medium">{appointment.full_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Phone</p>
                          <p className="text-gray-900 font-medium">{appointment.phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Problem</p>
                          <p className="text-gray-900 text-sm">{appointment.dental_problem}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-sm">Status</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
                              {appointment.status || "SCHEDULED"}
                            </span>
                            {(appointment as any).is_offline && (
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleOpenDialog(appointment)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setAppointmentToDelete(appointment._id);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      {appointment.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-gray-600 text-sm">Notes: {appointment.notes}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-white border-gray-300 text-gray-900 max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? "Edit Appointment" : "New Appointment"}
                </DialogTitle>
                <DialogDescription>
                  {isEditMode
                    ? "Update the appointment details and save your changes."
                    : "Fill in patient details to create a new appointment."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Full Name *
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Patient name"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Phone Number *
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Phone number"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        appointment_date: e.target.value,
                        appointment_time: "",
                      });
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-1 bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Time *
                  </label>
                  {formData.is_offline ? (
                    <>
                      <Input
                        type="time"
                        value={formData.appointment_time}
                        onChange={(e) =>
                          setFormData({ ...formData, appointment_time: e.target.value })
                        }
                        className="mt-1 bg-white border-gray-300 text-gray-900"
                      />
                      <p className="text-xs text-amber-700 mt-1">
                        Offline booking: you can enter any custom time (example: 09:45).
                      </p>
                    </>
                  ) : (
                    <Select
                      value={formData.appointment_time}
                      onValueChange={(value) =>
                        setFormData({ ...formData, appointment_time: value })
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        {allTimeSlots.map((slot) => {
                          const isBooked = bookedSlots.has(slot);
                          return (
                            <SelectItem
                              key={slot}
                              value={slot}
                              className={`${isBooked ? "text-red-600 opacity-60" : "text-gray-900"} hover:bg-blue-50`}
                              disabled={isBooked}
                            >
                              {slot} {isBooked ? "(Booked)" : "(Available)"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Dental Problem *
                  </label>
                  <Input
                    value={formData.dental_problem}
                    onChange={(e) =>
                      setFormData({ ...formData, dental_problem: e.target.value })
                    }
                    placeholder="e.g., Cavity, Cleaning, Root Canal"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="text-gray-700 text-sm font-medium">
                    Notes
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                    className="mt-1 bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="offline"
                    checked={formData.is_offline}
                    onCheckedChange={(checked) => {
                      const isOffline = checked === true;
                      setFormData((prev) => {
                        const next = { ...prev, is_offline: isOffline };
                        if (!isOffline && !allTimeSlots.includes(prev.appointment_time)) {
                          next.appointment_time = "";
                        }
                        return next;
                      });
                    }}
                    className="border-gray-300"
                  />
                  <label
                    htmlFor="offline"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    Walk-in / Offline Appointment
                  </label>
                </div>

                {isEditMode && (
                  <div>
                    <label className="text-gray-700 text-sm font-medium">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="mt-1 bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-300">
                        <SelectItem value="SCHEDULED" className="text-gray-900 hover:bg-blue-50">
                          Scheduled
                        </SelectItem>
                        <SelectItem value="COMPLETED" className="text-gray-900 hover:bg-blue-50">
                          Completed
                        </SelectItem>
                        <SelectItem value="CANCELLED" className="text-gray-900 hover:bg-blue-50">
                          Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
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
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent className="bg-white border-gray-300">
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
                  onClick={() =>
                    appointmentToDelete && handleDelete(appointmentToDelete)
                  }
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? "Cancelling..." : "Cancel Appointment"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
  );
}
