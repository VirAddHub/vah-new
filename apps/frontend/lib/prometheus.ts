/** Minimal Prometheus text parser -> { metricName: Array<{labels, value}> } */
export function parsePromText(input: string) {
  const lines = input.split(/\r?\n/);
  const data: Record<string, Array<{ labels: Record<string,string>; value: number }>> = {};
  
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    
    // ex: metric_name{a="b",c="d"} 123
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{([^}]*)\})?\s+([0-9.eE+-]+)$/);
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
    data[name].push({ labels, value });
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
