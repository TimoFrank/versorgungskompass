import assert from "node:assert/strict";
import { readFileSync, existsSync, constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";
import vm from "node:vm";
import { formatTechnicalTag, loadReleaseConfig } from "./lib/release_policy.mjs";
import { normalizeRepositoryUrl } from "./normalize_repository_url.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(new URL("./preflight_target_deployment.mjs", import.meta.url), "utf8")
  .replace(/^import[^\n]*\n/gmu, "");
const release = loadReleaseConfig(root);
const revision = "b".repeat(40);
const tagObject = "a".repeat(40);
const fingerprint = "C".repeat(40);
const evidenceRoot = "/synthetic-read-only-evidence";
const buildTag = "core-preflight-fixture-1";
const sourceRepository = "https://github.com/TimoFrank/versorgungskompass";
const base = {
  ARTIFACT_REGISTRY: "registry.example.invalid/core", API_IMAGE: "registry.example.invalid/core/api:fixture",
  API_BASE_URL: "https://core.example.invalid", FRONTEND_BASE_URL: "https://core.example.invalid",
  K8S_NAMESPACE: "core-fixture", DB_NAME: "core_fixture", DB_USER: "vk_app", DB_PASSWORD_SECRET_NAME: "core-fixture-db",
  API_AUTH_MODE: "oidc", DATA_POLICY: "approved-classes-only", RELEASE_TAG: formatTechnicalTag(release.productVersion),
  RELEASE_TAG_OBJECT_SHA: tagObject, RELEASE_TAG_SIGNER_FINGERPRINT: fingerprint,
  SOURCE_REVISION: revision, SOURCE_REPOSITORY: sourceRepository, BUILD_TAG: buildTag,
  EXTERNAL_SECURITY_EVIDENCE_ROOT: evidenceRoot, REQUIRE_EXTERNAL_SECURITY_EVIDENCE: "true", TARGET_DEPLOYMENT_APPROVED: "true",
  TARGET_API_ALLOWED_CIDRS_JSON: '["10.7.0.0/24"]',
  OIDC_ISSUER: "https://identity.example.invalid/issuer", OIDC_AUDIENCE: "core-fixture", OIDC_JWKS_URL: "https://identity.example.invalid/jwks"
};
const signedFixture = {
  schemaVersion: "versorgungs-kompass-target-source/v1", sourceRepository,
  gateRevision: "d".repeat(40), releaseTag: base.RELEASE_TAG, productVersion: release.productVersion,
  tagObjectSha: tagObject, sourceRevision: revision, signerFingerprint: fingerprint,
  tagSignatureVerified: true, remote: "origin", mainRef: "refs/remotes/origin/main", verified: true
};

function run({ env = {}, missing = "", verification = {}, noVerification = false,
  writableEvidence = false, symlinkEvidence = false, checkedOutRevision = revision, missingTool = "" } = {}) {
  const lines = [];
  let exitCode = 0;
  const exitSignal = Symbol("synthetic-preflight-exit");
  const verificationPath = "dist/security-evidence/source-tag-verification.json";
  const fakeFs = {
    constants,
    existsSync(file) {
      if (file === missing) return false;
      if (file === verificationPath) return !noVerification;
      return existsSync(path.resolve(root, file));
    },
    readFileSync(file) {
      if (file === verificationPath) return JSON.stringify({ ...signedFixture, ...verification });
      return readFileSync(path.resolve(root, file), "utf8");
    },
    lstatSync(file) {
      assert.ok([evidenceRoot, `${evidenceRoot}/${buildTag}`].includes(file), "Nur synthetische Evidence-Pfade sind zulässig.");
      return { isSymbolicLink: () => symlinkEvidence, isDirectory: () => true };
    },
    accessSync(file, mode) {
      assert.ok([evidenceRoot, `${evidenceRoot}/${buildTag}`].includes(file));
      if (mode === constants.W_OK && !writableEvidence) throw Object.assign(new Error("fixture read-only"), { code: "EACCES" });
    },
    realpathSync(file) { return file; }
  };
  const context = {
    fs: fakeFs, path, net, URL, formatTechnicalTag, normalizeRepositoryUrl,
    loadReleaseConfig: () => release,
    execFileSync(command, args) {
      if (command === "sh" && args[0] === "-lc" && args[1].startsWith("command -v ")) {
        if (args[1] === `command -v ${missingTool}`) throw new Error("fixture tool absent");
        return `/synthetic-tools/${args[1].slice("command -v ".length)}`;
      }
      if (command === "docker" && JSON.stringify(args) === '["info"]') return "synthetic daemon";
      if (command === "git" && JSON.stringify(args) === '["rev-parse","--verify","HEAD^{commit}"]') return checkedOutRevision;
      throw new Error(`Unerlaubter externer Testaufruf: ${command}`);
    },
    process: { env: { ...base, ...env }, exit(code) { exitCode = code; throw exitSignal; } },
    console: { log(value) { lines.push(String(value)); } }
  };
  try {
    vm.runInNewContext(source, context, { filename: "synthetic-core-deployment-preflight.mjs" });
  } catch (error) {
    if (error !== exitSignal) throw error;
  }
  return { exitCode, output: lines.join("\n") };
}

const positive = run();
assert.equal(positive.exitCode, 0, positive.output);
assert.match(positive.output, /Target Deployment Preflight OK/u);
assert.doesNotMatch(positive.output, /Datei fehlt/u, "Der Preflight muss allein mit den vorhandenen Kernquellen ausführbar sein.");
for (const options of [
  { missing: "deploy/postgres/gematik-core/schema.sql" },
  { missing: "scripts/check_gematik_core_readiness.mjs" },
  { missingTool: "kubectl" },
  { env: { API_AUTH_MODE: "iap" } },
  { env: { OIDC_AUDIENCE: "" } },
  { env: { OIDC_JWKS_URL: "http://identity.example.invalid/jwks" } },
  { env: { API_BASE_URL: "http://core.example.invalid" } },
  { env: { FRONTEND_BASE_URL: "https://other.example.invalid" } },
  { env: { DATA_POLICY: "anything" } },
  { env: { TARGET_DEPLOYMENT_APPROVED: "false" } },
  { env: { REQUIRE_EXTERNAL_SECURITY_EVIDENCE: "false" } },
  { env: { TARGET_API_ALLOWED_CIDRS_JSON: '["0.0.0.0/0"]' } },
  { env: { TARGET_API_ALLOWED_CIDRS_JSON: '["::/0"]' } },
  { env: { TARGET_API_ALLOWED_CIDRS_JSON: '["192.0.2.3/32"]' } },
  { env: { TARGET_API_ALLOWED_CIDRS_JSON: '["2001:db8::/32"]' } },
  { env: { TARGET_API_ALLOWED_CIDRS_JSON: '["10.7.0.0/24","10.7.0.0/24"]' } },
  { writableEvidence: true },
  { symlinkEvidence: true },
  { noVerification: true },
  { verification: { tagSignatureVerified: false } },
  { verification: { sourceRepository: "https://github.com/TimoFrank/mitmachen" } },
  { verification: { sourceRevision: "e".repeat(40) } },
  { verification: { tagObjectSha: "e".repeat(40) } },
  { checkedOutRevision: "e".repeat(40) },
  { env: { RELEASE_TAG: "poc-v0.1.0-rc.5" } }
]) {
  const negative = run(options);
  assert.equal(negative.exitCode, 1, `${JSON.stringify(options)}\n${negative.output}`);
  assert.match(negative.output, /Target Deployment Preflight FAILED/u);
  assert.doesNotMatch(negative.output, /Target Deployment Preflight OK/u);
}
console.log("Core-Deployment-Preflight: Kernquellen und 25 negative Auth-, Gateway-, Freigabe-, Evidence- und Quellbindungen synthetisch geprüft. Kein Deployment.");
