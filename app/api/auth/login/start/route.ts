import { NextRequest, NextResponse } from "next/server";
import { getUserForLogin, issueLoginOtp, createAndStoreSession } from "@/lib/server/auth-flow";
import { convex, convexAuthFns, verifyDeviceTrustToken, normalizeEmail, DEVICE_TRUST_DURATION_MS } from "@/lib/server/auth";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "tsd_auth_session";
const DEVICE_TRUST_COOKIE_NAME = "tsd_device_trust";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserForLogin(email, password);
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    // Check device trust cookie — skip OTP if trusted within 12 hours
    const deviceTrustToken = request.cookies.get(DEVICE_TRUST_COOKIE_NAME)?.value;
    if (deviceTrustToken) {
      const trusted = verifyDeviceTrustToken(deviceTrustToken);
      if (trusted && normalizeEmail(trusted.email) === normalizeEmail(email)) {
        const { rawSessionToken, expiresAt } = await createAndStoreSession(user._id);
        await convex.mutation(convexAuthFns.touchUserLogin, { userId: user._id as any });

        const response = NextResponse.json(
          {
            directLogin: true,
            user: {
              email: user.email,
              name: user.name || "Administrator",
              role: user.role || "admin",
            },
          },
          { status: 200 }
        );

        response.cookies.set({
          name: SESSION_COOKIE_NAME,
          value: rawSessionToken,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(expiresAt),
        });

        return response;
      }
    }

    const otpResult = await issueLoginOtp(user);
    return NextResponse.json(otpResult, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
