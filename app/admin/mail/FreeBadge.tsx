export default function FreeBadge({ tag }: { tag?: string | null }) {
  if (tag !== 'HMRC' && tag !== 'Companies House') return null;
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      FREE FORWARDING
    </span>
  );
}
