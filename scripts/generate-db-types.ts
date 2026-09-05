import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

mkdirSync("src/types", { recursive: true });
const supabaseCli = join(process.cwd(), "node_modules", ".pnpm", "supabase@2.116.0", "node_modules", "supabase", "dist", "supabase.js");
const output = execFileSync(process.execPath, [supabaseCli, "gen", "types", "typescript", "--local"], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
});
writeFileSync("src/types/database.types.ts", output.trimEnd() + "\n", { encoding: "utf8" });
process.stdout.write("Generated src/types/database.types.ts as UTF-8.\n");
