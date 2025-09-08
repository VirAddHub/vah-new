import { Suspense } from "react";
import ConfirmClient from "./ConfirmClient";

export const dynamic = "force-dynamic"; // avoid static export error on build

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <ConfirmClient />
    </Suspense>
  );
}
