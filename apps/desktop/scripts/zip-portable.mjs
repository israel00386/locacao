// Versão portátil: a pasta do programa compactada em .zip (descompacte e abra "LOCAR Equipamentos.exe").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const v = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const out = `dist/LOCAR-Equipamentos-Portatil-${v}.zip`;
fs.rmSync(out, { force: true });
fs.rmSync("dist/LOCAR Equipamentos", { recursive: true, force: true });
fs.cpSync("dist/win-unpacked", "dist/LOCAR Equipamentos", { recursive: true });
execFileSync("zip", ["-qr9", `LOCAR-Equipamentos-Portatil-${v}.zip`, "LOCAR Equipamentos"], { cwd: "dist" });
fs.rmSync("dist/LOCAR Equipamentos", { recursive: true, force: true });
console.log("gerado", out);
