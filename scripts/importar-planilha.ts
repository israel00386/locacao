// Uso: pnpm importar caminho/da/planilha.xlsx [--substituir]
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { importWorkbook } from "../src/lib/importer";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: pnpm importar planilha.xlsx [--substituir]");
    process.exit(1);
  }
  const db = new PrismaClient();
  try {
    const buf = await readFile(file);
    const report = await importWorkbook(db, buf, { replace: process.argv.includes("--substituir") });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
