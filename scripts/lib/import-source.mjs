import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, constants, fstatSync, ftruncateSync, lstatSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const manifestPath = "source-provenance.json";
export const upstreamManifestPath = "dokumentation/quellen/ursprungsmanifest.json";
export const coreRepository = "https://github.com/TimoFrank/versorgungskompass";
const excluded = /^(?:node_modules\/|dist\/|\.env(?:\.|$)|deploy\/(?:terraform|typo3|google-[^/]+)\/|config\/(?:pre-gematik|pages-demo)\/|frontend\/(?:demo|identity-portal|pages|public-entry)\/|frontend\/data\/(?:demo-data|public-politics-directory)\.js$|public\/brand\/modules\/(?:stakeholder|formate)\/|api\/(?:google-|mac-sync|password-reset|user-administration|typo3-registration))/u;
const untrackedArtifacts = /^(?:node_modules|dist|test-results|playwright-report|\.playwright-cli|output|outputs|coverage|backups)\/|(?:^|\/)node_modules\/|(?:^|\/)\.DS_Store$|^\.env(?:\.|$)|\.(?:log|tmp|bak)$/u;

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sourceFiles(root) {
  // Git-Ignore-Dateien werden hier bewusst nicht ausgewertet. Ausschließlich
  // die festgelegten unversionierten Build- und Arbeitsdateien bleiben draußen.
  const list = (...args) => execFileSync("git", ["ls-files", ...args, "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const tracked = list("--cached");
  const untracked = list("--others").filter(file => !untrackedArtifacts.test(file));
  return [...new Set([...tracked, ...untracked])].filter(file => file !== manifestPath).sort();
}

export function inventorySource(root, paths = sourceFiles(root)) {
  assert(paths.length > 0, "Der Importbestand ist leer.");
  return paths.map(file => {
    assert(!path.isAbsolute(file) && !file.split("/").includes(".."), `Ungültiger Quellpfad: ${file}`);
    assert(!excluded.test(file), `Ausgeschlossene Quelle im Kernrepo: ${file}`);
    let checked = root;
    for (const part of file.split("/")) {
      checked = path.join(checked, part);
      assert(!lstatSync(checked).isSymbolicLink(), `Symlink im Importbestand: ${file}`);
    }
    assert(lstatSync(checked).isFile(), `Keine reguläre Quelldatei: ${file}`);
    const bytes = readFileSync(checked);
    return { path: file, sha256: sha256(bytes), size: bytes.length };
  });
}

export function makeImportManifest(root) {
  const files = inventorySource(root);
  const originalBytes = readFileSync(path.join(root, upstreamManifestPath));
  const upstream = JSON.parse(originalBytes);
  assert.equal(upstream.productScope, "gematik-core");
  assert.match(upstream.sourceRevision, /^[a-f0-9]{40}$/);
  return {
    schemaVersion: "mitmachen-gematik-import/v1",
    repository: coreRepository,
    productScope: "gematik-core",
    releaseEligible: false,
    purpose: "Geprüfte Quellübergabe für den GitLab-URL-Import. Keine Betriebs- oder Release-Freigabe.",
    upstream: {
      repository: "https://github.com/TimoFrank/mitmachen",
      baselineCommit: upstream.sourceRevision,
      includesUncommittedPreparation: upstream.workingTreeDirty,
      originalExportManifest: upstreamManifestPath,
      originalExportManifestSha256: sha256(originalBytes)
    },
    inventoryDigest: `sha256:${sha256(JSON.stringify(files))}`,
    files
  };
}

export function verifyImportManifest(root, manifest) {
  assert.equal(manifest.schemaVersion, "mitmachen-gematik-import/v1");
  assert.equal(manifest.repository, coreRepository);
  assert.equal(manifest.productScope, "gematik-core");
  assert.equal(manifest.releaseEligible, false, "Ein Importmanifest erteilt keine Release-Freigabe.");
  const expected = makeImportManifest(root);
  assert.deepEqual(manifest, expected, "Dateibestand, Herkunft oder Hashwerte weichen vom Importmanifest ab. Bewusste Änderungen prüfen und anschließend das Manifest neu erzeugen.");
  return manifest.files.length;
}

export function readImportManifest(root) {
  const fd = openSync(path.join(root, manifestPath), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.nlink === 1, "Das Importmanifest muss eine eigenständige reguläre Datei sein.");
    return JSON.parse(readFileSync(fd, "utf8"));
  } finally {
    closeSync(fd);
  }
}

export function writeImportManifest(root, manifest) {
  const fd = openSync(path.join(root, manifestPath), constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW, 0o644);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.nlink === 1, "Das Importmanifest muss eine eigenständige reguläre Datei sein.");
    const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
    // Erst nach der Dateiprüfung schreiben und kürzen.
    writeFileSync(fd, bytes);
    ftruncateSync(fd, Buffer.byteLength(bytes));
  } finally {
    closeSync(fd);
  }
}
