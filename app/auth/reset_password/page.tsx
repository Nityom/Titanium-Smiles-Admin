// app/reset-password/page.tsx
import { Suspense } from "react";
import ResetPassword from "@/components/ResetPassword";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}