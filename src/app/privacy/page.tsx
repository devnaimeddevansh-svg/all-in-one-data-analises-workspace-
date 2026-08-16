import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-300">
          <p>
            NexusOS (&quot;we&quot;, &quot;our&quot;) respects your privacy. This policy explains how we
            collect, use, and protect your information when you use our AI Operating System.
          </p>
          <h2 className="font-semibold text-zinc-100">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information (name, email) when you register or sign in with Google</li>
            <li>Content you submit to AI features (chat, research, documents)</li>
            <li>Usage data for billing and service limits</li>
          </ul>
          <h2 className="font-semibold text-zinc-100">How We Use Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and improve AI features</li>
            <li>Authenticate users and secure accounts</li>
            <li>Process subscriptions and usage limits</li>
          </ul>
          <h2 className="font-semibold text-zinc-100">Third-Party Services</h2>
          <p>
            We use Google for authentication, Groq for AI inference, and Stripe for payments.
            Each service has its own privacy policy.
          </p>
          <h2 className="font-semibold text-zinc-100">Data Security</h2>
          <p>
            Passwords are hashed. Sessions use secure HTTP-only cookies. API keys are stored
            server-side only. Integration credentials are encrypted at rest.
          </p>
          <h2 className="font-semibold text-zinc-100">Contact</h2>
          <p>For privacy questions, contact your workspace administrator.</p>
          <Link href="/login">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
