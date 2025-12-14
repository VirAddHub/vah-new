import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default function BillingPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (Array.isArray(v)) {
      for (const item of v) qs.append(k, item);
    } else if (typeof v === "string" && v.length) {
      qs.set(k, v);
    }
  }
  const suffix = qs.toString();
  redirect(suffix ? `/account?${suffix}` : "/account");
}
