// Põe o ícone e os dados da empresa no .exe (faz o papel do rcedit, sem precisar de Wine).
import fs from "node:fs";
import * as PE from "pe-library";
import * as ResEdit from "resedit";

const exePath = "dist/win-unpacked/LOCAR Equipamentos.exe";
const exe = PE.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PE.NtExecutableResource.from(exe);

const ico = ResEdit.Data.IconFile.from(fs.readFileSync("build/icon.ico"));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const groupId = groups.length ? groups[0].id : 1;
const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, ico.icons.map((i) => i.data));

const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const v = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const [ma, mi, pa] = v.split(".").map(Number);
vi.setFileVersion(ma, mi, pa, 0, 1033);
vi.setProductVersion(ma, mi, pa, 0, 1033);
vi.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    CompanyName: "LOCAR Equipamentos",
    FileDescription: "LOCAR Equipamentos",
    ProductName: "LOCAR Equipamentos",
    LegalCopyright: "LOCAR Equipamentos",
    OriginalFilename: "LOCAR Equipamentos.exe",
    InternalName: "LOCAR Equipamentos",
  },
);
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log("ícone e versão aplicados em", exePath);
