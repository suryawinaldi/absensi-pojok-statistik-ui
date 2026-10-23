import { build } from "esbuild";
import { cp, mkdir, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
// Only the build-owned output directory is recreated.
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "admin/assets"), { recursive: true });
for (const item of ["index.html", "js", "css"]) {
  await cp(path.join(root, item), path.join(output, item), { recursive: true });
}
for (const item of ["index.html", "styles.css"]) {
  await cp(path.join(root, "admin", item), path.join(output, "admin", item));
}
await mkdir(path.join(output, "prototype"), { recursive: true });
for (const item of ["index.html", "styles.css", "app.js"]) {
  await cp(
    path.join(root, "prototype", item),
    path.join(output, "prototype", item),
  );
}
// The existing anon/publishable key is public configuration, never a service-role key.
const existing = await readFile(path.join(root, "js/supabase.js"), "utf8");
const url =
  process.env.PUBLIC_SUPABASE_URL ||
  existing.match(/SUPABASE_URL\s*=\s*'([^']+)'/)?.[1];
const key =
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  existing.match(/SUPABASE_KEY\s*=\s*'([^']+)'/)?.[1];
if (!url || !key || new URL(url).protocol !== "https:")
  throw new Error(
    "Valid public Supabase URL and anon/publishable key are required.",
  );
if (key.startsWith("sb_secret_"))
  throw new Error("Never bundle a Supabase secret key.");
if (key.split(".").length === 3) {
  const payload = JSON.parse(
    Buffer.from(key.split(".")[1], "base64url").toString(),
  );
  if (payload.role !== "anon")
    throw new Error("Only an anon key may be bundled.");
} else if (!key.startsWith("sb_publishable_"))
  throw new Error("Use an anon or publishable key.");
await build({
  entryPoints: [path.join(root, "admin/src/main.js")],
  outfile: path.join(output, "admin/assets/app.js"),
  bundle: true,
  format: "esm",
  target: ["es2022"],
  minify: true,
  define: {
    __SUPABASE_URL__: JSON.stringify(url),
    __SUPABASE_ANON_KEY__: JSON.stringify(key),
  },
  logLevel: "info",
});
console.log(
  "Static site built. Existing app: / · New admin workspace: /admin/ · Design demo: /prototype/",
);
