const fs = require("node:fs");
const path = require("node:path");
const root = process.env.RELEASE_ROOT || process.cwd();
const addon = path.join(root, "unifi-ingress-preview");
const version = process.env.VERSION || "";
if (!/^\d{4}\.\d{2}\.\d{2}$/.test(version)) throw new Error("Use YYYY.MM.NN, for example 2026.11.02");
const semver = version.split(".").map(Number).join(".");
const configPath = path.join(addon, "config.yaml");
const config = fs.readFileSync(configPath, "utf8");
const current = config.match(/^version:\s*["']?([\d.]+)["']?\s*$/m)?.[1];
if (!current) throw new Error("Missing config version");
const mode = process.argv[2];
if (mode === "prepare") {
  if (version <= current) throw new Error("New version must be greater than current version");
  const notes = fs.readFileSync(path.join(root, "release-notes.md"), "utf8").trim();
  if (!notes) throw new Error("Empty release notes");
  fs.writeFileSync(configPath, config.replace(/^version:.*$/m, 'version: "' + version + '"'));
  for (const file of ["package.json", "package-lock.json"]) {
    const p = path.join(addon, "app", file);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    data.version = semver;
    if (data.packages?.[""]) data.packages[""].version = semver;
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  }
  const changelog = path.join(addon, "CHANGELOG.md");
  fs.writeFileSync(changelog, "# Versión " + version + "\n\n" + notes + "\n\n" + fs.readFileSync(changelog, "utf8"));
  fs.writeFileSync(path.join(root, "RELEASE_NOTES.md"), notes + "\n");
} else if (mode === "check") {
  if (version !== current) throw new Error("Requested version differs from checked-out config");
  for (const file of ["package.json", "package-lock.json"]) {
    const data = JSON.parse(fs.readFileSync(path.join(addon,"app",file),"utf8"));
    if (data.version !== semver || (data.packages?.[""] && data.packages[""].version !== semver)) throw new Error("npm version mismatch");
  }
  const text = fs.readFileSync(path.join(addon, "CHANGELOG.md"),"utf8");
  const heading = "# Versión " + version + "\n";
  const start = text.indexOf(heading);
  if (start < 0) throw new Error("Missing version changelog section");
  const rest = text.slice(start + heading.length);
  const boundary = rest.search(/^# (?:Versión |Changelog)/m);
  const notes = (boundary < 0 ? rest : rest.slice(0,boundary)).trim();
  if (!notes) throw new Error("Empty changelog section");
  fs.writeFileSync(path.join(root,"release-notes.md"),notes+"\n");
} else throw new Error("Expected prepare or check");
