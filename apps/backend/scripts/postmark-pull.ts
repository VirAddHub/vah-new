// apps/backend/scripts/postmark-pull.ts
import * as fs from "fs/promises";
import * as path from "path";
import * as postmark from "postmark";

type TemplateSummary = {
    Active: boolean;
    TemplateId: number;
    Name: string;
    Alias: string | null;
    TemplateType: "Standard" | "Layout";
    LayoutTemplate: string | null;
};

async function main() {
    const token = process.env.POSTMARK_TOKEN;
    if (!token) throw new Error("POSTMARK_TOKEN is required (server token).");

    const outDir = path.resolve(process.cwd(), "postmark_templates");
    await fs.mkdir(outDir, { recursive: true });

    const client = new postmark.ServerClient(token);

    let offset = 0;
    const count = 100;
    const all: TemplateSummary[] = [];

    // paginate list
    while (true) {
        const page = await client.getTemplates({ count, offset });
        all.push(...(page.Templates as TemplateSummary[]));
        if (page.Templates.length < count) break;
        offset += count;
    }

    if (all.length === 0) {
        console.log("No templates found on this server.");
        return;
    }

    console.log(`Found ${all.length} templates. Fetching full content...`);

    let saved = 0;
    for (const t of all) {
        // fetch full template by id to include Subject/HtmlBody/TextBody
        const full = await client.getTemplate(t.TemplateId);

        // filename: prefer alias, else use id
        const baseName =
            (t.Alias && t.Alias.trim().length > 0 ? t.Alias : String(t.TemplateId))
                // keep it filesystem-safe
                .replace(/[^a-zA-Z0-9._-]/g, "_");

        const file = path.join(outDir, `${baseName}.json`);

        // what we persist (clean, ready for re-sync)
        const toSave = {
            TemplateId: full.TemplateId,
            Name: full.Name,
            Alias: full.Alias ?? null,
            Active: full.Active,
            TemplateType: full.TemplateType,
            LayoutTemplate: full.LayoutTemplate ?? null,
            Subject: full.Subject ?? "",
            HtmlBody: full.HtmlBody ?? "",
            TextBody: full.TextBody ?? "",
        };

        await fs.writeFile(file, JSON.stringify(toSave, null, 2), "utf8");
        console.log(`✓ saved ${baseName}.json`);
        saved++;
    }

    // Write an index file for quick overview
    const index = all
        .map((t) => ({
            TemplateId: t.TemplateId,
            Name: t.Name,
            Alias: t.Alias,
            Type: t.TemplateType,
            Active: t.Active,
            LayoutTemplate: t.LayoutTemplate,
        }));
    await fs.writeFile(
        path.join(outDir, "_index.json"),
        JSON.stringify(index, null, 2),
        "utf8"
    );

    console.log(`\nDone. Saved ${saved} templates to ${outDir}`);
    console.log("Index:", path.join(outDir, "_index.json"));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
