import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

it("ships the complete upstream MIT notice for the JSX rule port", (t) => {
  const destination = mkdtempSync(path.join(tmpdir(), "uba-pack-"));
  t.after(() => rmSync(destination, { force: true, recursive: true }));
  execFileSync("pnpm", ["pack", "--pack-destination", destination], {
    cwd: root,
    env: { ...process.env, HUSKY: "0" },
    stdio: "pipe",
  });
  const archive = path.join(
    destination,
    readdirSync(destination).find((name) => name.endsWith(".tgz")),
  );
  const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" });
  assert.ok(files.split("\n").includes("package/THIRD_PARTY_NOTICES"));
  const notice = execFileSync(
    "tar",
    ["-xOf", archive, "package/THIRD_PARTY_NOTICES"],
    { encoding: "utf8" },
  );
  assert.match(notice, /eslint-plugin-react 7\.37\.5/u);
  assert.match(notice, /jsx-no-leaked-render/u);
  assert.match(notice, /Copyright \(c\) 2014 Yannick Croissant/u);
  const license = readFileSync(path.join(root, "LICENSE"), "utf8");
  const permissionAndDisclaimer = license.slice(license.indexOf("Permission"));
  assert.ok(notice.includes(permissionAndDisclaimer.trim()));
});
