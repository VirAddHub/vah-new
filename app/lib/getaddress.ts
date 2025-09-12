export type Address = {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  county?: string;
  postcode: string;
  country?: string;
  formatted?: string;
};

export type Suggestion = { id: string; label: string };

export async function gaAutocomplete(q: string): Promise<Suggestion[]> {
  const res = await fetch(`/api/bff/address/autocomplete?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.suggestions ?? [];
}

export async function gaGetById(id: string): Promise<Address | null> {
  const res = await fetch(`/api/bff/address/get/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.address ?? null;
}

export async function gaFindByPostcode(postcode: string): Promise<Address[]> {
  const res = await fetch(`/api/bff/address/find/${encodeURIComponent(postcode)}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.addresses ?? [];
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300) {
  let t: any; 
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    return new Promise<ReturnType<T>>((resolve) => {
      t = setTimeout(async () => resolve(await fn(...args)), ms);
    });
  };
}
