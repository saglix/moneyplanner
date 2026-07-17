import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("exports the money planner shell for static hosting", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Money Planner<\/title>/i);
  assert.match(html, /Money Planner/);
  assert.match(html, /_next\/static/);
  assert.doesNotMatch(
    html,
    /codex-preview|SkeletonPreview|react-loading-skeleton/i,
  );

  await access(new URL("../out/_next/", import.meta.url));
});

test("keeps starter preview code out of the app", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Cash flow matrix/);
  assert.match(layout, /title:\s*"Money Planner"/);
  assert.doesNotMatch(
    page + layout + packageJson,
    /codex-preview|SkeletonPreview|react-loading-skeleton/i,
  );
});
