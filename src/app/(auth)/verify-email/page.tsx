"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => setStatus(data.message ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {status === "loading" && "Verifying email..."}
          {status === "success" && "Email verified!"}
          {status === "error" && "Verification failed"}
        </CardTitle>
        <CardDescription>
          {status === "success" && "Your email has been verified. You can now sign in."}
          {status === "error" && "The verification link is invalid or has expired."}
        </CardDescription>
      </CardHeader>
      {status !== "loading" && (
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Go to sign in</Button>
          </Link>
        </CardContent>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
