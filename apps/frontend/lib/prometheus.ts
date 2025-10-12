/** Minimal Prometheus text parser -> { metricName: Array<{labels, value, bucketLe?}> } */
export function parsePromText(input: string) {
  const lines = input.split(/\r?\n/);
  const data: Record<string, Array<{ labels: Record<string,string>; value: number; bucketLe?: number }>> = {};
  
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    // histogram bucket example:
    // forwarding_transition_latency_ms_bucket{from="Requested",to="Processing",le="60000"} 42
    const hb = line.match(/^([a-zA-Z_:][\w:]*_bucket)(\{([^}]*)\})?\s+([0-9.eE+-]+)$/);
    if (hb) {
      const [, name, , rawLabels, rawValue] = hb;
      const labels: Record<string,string> = {};
      let le: number | undefined = undefined;
      if (rawLabels) {
        rawLabels.split(",").forEach(pair => {
          const [k, v] = pair.split("=");
          if (!k) return;
          const val = (v || "").replace(/^"/, "").replace(/"$/, "");
          if (k.trim() === "le") le = val === "+Inf" ? Number.POSITIVE_INFINITY : Number(val);
          else labels[k.trim()] = val;
        });
      }
      const value = Number(rawValue);
      if (!data[name]) data[name] = [];
      data[name].push({ labels, value: Number.isFinite(value) ? value : 0, bucketLe: le });
      continue;
    }

    // standard counter/gauge:
    const m = line.match(/^([a-zA-Z_:][\w:]*)(\{([^}]*)\})?\s+([0-9.eE+-]+)$/);
    if (!m) continue;
    const [, name, , rawLabels, rawValue] = m;
    const labels: Record<string,string> = {};
    if (rawLabels) {
      rawLabels.split(",").forEach(pair => {
        const [k, v] = pair.split("=");
        if (!k) return;
        labels[k.trim()] = (v || "").replace(/^"/, "").replace(/"$/, "");
      });
    }
    const value = Number(rawValue);
    if (!data[name]) data[name] = [];
    data[name].push({ labels, value: Number.isFinite(value) ? value : 0 });
  }
  
  return data;
}

/** Helpers: sums with optional label filters */
export function sumMetric(
  parsed: ReturnType<typeof parsePromText>,
  name: string,
  where: Partial<Record<string,string>> = {}
) {
  const arr = parsed[name] || [];
  return arr.reduce((acc, cur) => {
    for (const [k, v] of Object.entries(where)) {
      if ((cur.labels[k] ?? "") !== v) return acc;
    }
    return acc + (Number.isFinite(cur.value) ? cur.value : 0);
  }, 0);
}

/** Get the latest value for a metric (useful for counters) */
export function getLatestMetric(
  parsed: ReturnType<typeof parsePromText>,
  name: string,
  where: Partial<Record<string,string>> = {}
) {
  const arr = parsed[name] || [];
  const filtered = arr.filter(item => {
    for (const [k, v] of Object.entries(where)) {
      if ((item.labels[k] ?? "") !== v) return false;
    }
    return true;
  });
  
  return filtered.length > 0 ? filtered[filtered.length - 1].value : 0;
}

/** Get all unique label values for a metric */
export function getMetricLabelValues(
  parsed: ReturnType<typeof parsePromText>,
  name: string,
  labelKey: string
): string[] {
  const arr = parsed[name] || [];
  const values = new Set<string>();
  
  arr.forEach(item => {
    const value = item.labels[labelKey];
    if (value) values.add(value);
  });
  
  return Array.from(values);
}

/** Estimate histogram quantile (e.g., p95) from *_bucket cumulative series */
export function estimateHistogramQuantile(
  parsed: ReturnType<typeof parsePromText>,
  baseName: string, // e.g. "forwarding_transition_latency_ms"
  q: number, // 0..1
  where: Partial<Record<string,string>> = {}
): number | null {
  const buckets = parsed[`${baseName}_bucket`] || [];
  const filtered = buckets.filter(b => {
    for (const [k, v] of Object.entries(where)) {
      if ((b.labels[k] ?? "") !== v) return false;
    }
    return true;
  });
  if (!filtered.length) return null;

  // group by le; take the latest value per le (already cumulative)
  const map = new Map<number, number>();
  for (const b of filtered) {
    if (typeof b.bucketLe !== "number") continue;
    map.set(b.bucketLe, (map.get(b.bucketLe) ?? 0) + (Number.isFinite(b.value) ? b.value : 0));
  }
  const ordered = [...map.entries()].sort((a,b)=>a[0]-b[0]);
  const total = ordered.at(-1)?.[1] ?? 0;
  if (total <= 0) return null;

  const target = total * q;
  for (const [le, cum] of ordered) {
    if (cum >= target) return le === Infinity ? NaN : le;
  }
  return null;
}

/** Extract gauge values into (label->value) rows */
export function rowsFor(
  parsed: ReturnType<typeof parsePromText>,
  name: string,
  labelKey: string
) {
  return (parsed[name] || []).map(m => ({ key: m.labels[labelKey] || "unknown", value: m.value }));
}
