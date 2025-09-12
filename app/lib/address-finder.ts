export type Address = {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: 'United Kingdom';
};

export async function searchAddress(postcode: string, building?: string): Promise<Address[]> {
  const p = postcode.trim();
  if (!p) return [];
  const qs = new URLSearchParams({ postcode: p });
  if (building?.trim()) qs.set('building', building.trim());
  const res = await fetch(`/api/bff/address/search?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const data = await res.json();
  return (data.addresses || []) as Address[];
}
