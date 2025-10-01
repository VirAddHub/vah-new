// Server Component
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient"; // your existing client form

export default function LoginPage() {
  // Must match your backend cookie name
  const isAuthed = cookies().has("vah_jwt");

  if (isAuthed) {
    // Hard redirect before render — no flicker, no client race
    redirect("/dashboard");
  }

  // Render your existing client form when not authed
  return <LoginClient />;
}
