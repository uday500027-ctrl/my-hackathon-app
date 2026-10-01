/**
 * scripts/check-detectors.mjs
 * Quick unit-style smoke test for the detectors.
 * Run with: node scripts/check-detectors.mjs
 * Exit code 0 = all assertions passed; non-zero = failure.
 */

// We import via the compiled output path. When running from source, use ts-node
// or the tsx shim. For a plain-node check we inline the required subset.

// ─── Inline the two helpers we need (no import machinery) ───────────────────

// Luhn
function luhnValidate(numStr) {
  const digits = numStr.replace(/[\s\-]/g, "").split("").map(Number);
  if (digits.some(isNaN) || digits.length < 13) return false;
  let sum = 0, double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

// Verhoeff tables
const D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
const INV = [0,4,3,2,1,5,6,7,8,9];

function verhoeffGenerateCheckDigit(numStr) {
  const digits = numStr.replace(/\s/g, "").split("").reverse().map(Number);
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = D[c][P[(i + 1) % 8][digits[i]]];
  }
  return String(INV[c]);
}

// ─── Inline detectApiKey (mirrors lib/detectors.ts exactly) ──────────────────

function detectApiKey(text) {
  const results = [];

  const namedPatterns = [
    /AIza[0-9A-Za-z_\-]{20,}/g,
    /sk-[A-Za-z0-9_\-]{20,}/g,
    /ghp_[A-Za-z0-9]{20,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /sb_secret_[A-Za-z0-9_\-]{10,}/g,
    /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+/g,
  ];

  for (const re of namedPatterns) {
    const g = new RegExp(re.source, re.flags);
    let m;
    while ((m = g.exec(text)) !== null) {
      results.push({ category: "api_key", value: m[0] });
    }
  }

  const genericRe =
    /(?:api[_\- ]?key|token|secret|access[_\-]?key|auth)[^\n]{0,40}?[:=]\s*["']?([A-Za-z0-9_\-./+]{16,})["']?/gi;
  const g = new RegExp(genericRe.source, genericRe.flags);
  let m;
  while ((m = g.exec(text)) !== null) {
    results.push({ category: "api_key", value: m[1] });
  }

  return results;
}

// ─── Assertions ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    failed++;
  }
}

console.log("\n── API key detector ─────────────────────────────────────────\n");

// Build sample key the same way the scan page does (concatenation)
const fakeKey = ["AIza", "SyBkFake", "TestKey1234", "abcdefghijk"].join("");
// → "AIzaSyBkFakeTestKey1234abcdefghijk"  (34 chars after "AIza" = 30 suffix chars)

const sampleText = [
  `Contact jane.doe@example.com`,
  `API key for testing: ${fakeKey}`,
].join("\n");

const apiKeyFindings = detectApiKey(sampleText);

assert(
  `Sample text with AIza-prefix key (${fakeKey.length} chars) produces an api_key finding`,
  apiKeyFindings.some((f) => f.value.startsWith("AIza"))
);

assert(
  `Matched value is the key itself, not the label`,
  apiKeyFindings.every((f) => !f.value.includes("API key"))
);

// Named pattern directly
assert(
  `AIza + 20 chars → detected`,
  detectApiKey("AIzaSyBkFakeTestKey1234abcde").some((f) => f.category === "api_key")
);

assert(
  `sk- + 20 chars → detected`,
  detectApiKey("sk-abcdefghijklmnopqrst123456").some((f) => f.category === "api_key")
);

assert(
  `ghp_ + 20 chars → detected`,
  detectApiKey("ghp_abcdefghijklmnopqrstu").some((f) => f.category === "api_key")
);

assert(
  `sb_secret_ + 10 chars → detected`,
  detectApiKey("sb_secret_abcde12345").some((f) => f.category === "api_key")
);

console.log("\n── Luhn (card) validator ────────────────────────────────────\n");

assert(
  `4111 1111 1111 1111 (valid Luhn) → passes`,
  luhnValidate("4111111111111111")
);

assert(
  `4111 1111 1111 1112 (invalid Luhn) → fails`,
  !luhnValidate("4111111111111112")
);

console.log("\n── Verhoeff (Aadhaar) helper ────────────────────────────────\n");

const base = "23451234567";
const check = verhoeffGenerateCheckDigit(base);
assert(
  `verhoeffGenerateCheckDigit produces a single decimal digit`,
  /^\d$/.test(check)
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} assertions: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
