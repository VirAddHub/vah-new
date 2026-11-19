import fs from "fs";
import path from "path";

const here = path.resolve(__dirname, "..");
const uiDirs = [path.join(here, "components"), path.join(here, "app")];
const contentDir = path.join(here, "src/content");

// Unverifiable claims (customer counts, ratings, awards, certifications, uptime) must not appear
// until confirmed details are supplied. Ordinary words ("Best Value", "leading-tight") are allowed.
test("no unverified marketing claims in UI", () => {
  const re = /trusted by|award-winning|\bawarded\b|#\s*users|\bmillions? of\b|GDPR-certified|FCA[- ](approved|authorised|regulated)|HMRC[- ]approved|industry[- ]leading|\bpremier\b|top-rated|\d[\d,]*\+\s*(businesses|customers|users|companies|clients)|99\.9%|aggregateRating|reviewCount/i;

  for (const dir of uiDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = walk(dir, [".tsx", ".ts", ".jsx", ".js"]);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const m = src.match(re);
      if (m && !f.includes("content") && !f.includes("test")) {
        throw new Error(`Unverified marketing claim "${m[0]}" in ${f}`);
      }
    }
  }
});

test("content.ts is properly frozen", () => {
  const contentPath = path.join(contentDir, "content.ts");
  if (!fs.existsSync(contentPath)) {
    throw new Error(`Content file not found at ${contentPath}`);
  }

  const src = fs.readFileSync(contentPath, "utf8");
  if (!src.includes("Object.freeze(copy)")) {
    throw new Error("Content object must be frozen to prevent mutation");
  }
});

test("no PWA prompts or notification requests in UI", () => {
  const re = /install.*app|enable.*notification|PWAInstallPrompt|NotificationPermission|beforeinstallprompt|ServiceWorkerRegistration/i;

  for (const dir of uiDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = walk(dir, [".tsx", ".ts", ".jsx", ".js"]);
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      if (re.test(src) && !f.includes("test") && !f.includes("spec")) {
        throw new Error(`PWA prompt found in ${f}. These features are disabled.`);
      }
    }
  }
});

function walk(dir: string, exts: string[], acc: string[] = []): string[] {
  try {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      const stat = fs.statSync(p);
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        walk(p, exts, acc);
      } else if (exts.includes(path.extname(p))) {
        acc.push(p);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  return acc;
}
