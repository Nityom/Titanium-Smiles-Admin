import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

http.route({
  path: "/appointments/booked-slots",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/appointments/booked-slots",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const { appointment_date, doctor_name } = await req.json();

      if (!appointment_date) {
        return json({ error: "appointment_date is required" }, 400);
      }

      const bookedSlots = await ctx.runQuery(api.appointments.getBookedSlots, {
        appointment_date,
        doctor_name,
      });

      return json({ bookedSlots });
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  }),
});

http.route({
  path: "/appointments/book",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: corsHeaders })),
});

http.route({
  path: "/appointments/book",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const requiredFields = [
        "appointment_date",
        "appointment_time",
        "doctor_name",
        "dental_problem",
        "full_name",
        "phone",
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return json({ error: `${field} is required` }, 400);
        }
      }

      const id = await ctx.runMutation(api.appointments.create, {
        appointment_date: body.appointment_date,
        appointment_time: body.appointment_time,
        dental_problem: body.dental_problem,
        doctor_name: body.doctor_name,
        full_name: body.full_name,
        phone: body.phone,
        notes: body.notes,
      });

      return json({ id }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("already booked") ? 409 : 500;
      return json({ error: message }, status);
    }
  }),
});

export default http;
