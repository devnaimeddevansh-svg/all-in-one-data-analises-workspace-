import { Suspense } from "react";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
