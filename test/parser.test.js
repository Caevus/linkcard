// Parser contract: every fixture in test/fixtures is a saved Snapshot plus its expected values.
// Checks only headline, outlet, date, link. See test/fixtures/README.md.
process.env.TZ = "America/Denver"; // pin the viewer zone so date results do not depend on the machine
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRegistry } from "../js/outlet-registry.js";
import { parseArticle } from "../js/parser.js";

const fixturesDir = new URL("./fixtures/", import.meta.url);
const registry = createRegistry(readFileSync(new URL("../outlets.yaml", import.meta.url), "utf8"));
const names = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".snapshot.json"))
  .map((f) => f.slice(0, -".snapshot.json".length));

if (names.length === 0) {
  test("parser fixtures", { todo: "no fixtures yet; see test/fixtures/README.md" }, () => {});
}

for (const name of names) {
  test(`parser: ${name}`, () => {
    const read = (suffix) => JSON.parse(readFileSync(new URL(`${name}${suffix}`, fixturesDir), "utf8"));
    const expected = read(".expected.json");
    const a = parseArticle(read(".snapshot.json"), registry);
    const { headline, outlet, date, link } = a;
    assert.deepEqual({ headline, outlet, date, link }, {
      headline: expected.headline, outlet: expected.outlet, date: expected.date, link: expected.link,
    });
  });
}
