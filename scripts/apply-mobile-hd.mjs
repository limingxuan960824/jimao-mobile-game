import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamePath = path.join(root, "src", "game.js");
const manifestPath = path.join(root, "source-manifest.json");
const mobileLow =
  'if(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<900)return{...Pr.low};';
const mobileHigh =
  'if(/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||navigator.maxTouchPoints>1&&Math.min(screen.width,screen.height)<900)return{...Pr.high};';
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const before = fs.readFileSync(gamePath);
const source = before.toString("utf8");
const lowCount = source.split(mobileLow).length - 1;
const highCount = source.split(mobileHigh).length - 1;

if (lowCount === 1 && highCount === 0) {
  fs.writeFileSync(gamePath, source.replace(mobileLow, mobileHigh));
} else if (lowCount !== 0 || highCount !== 1) {
  throw new Error(
    `Unexpected mobile quality boundary: low=${lowCount}, high=${highCount}`,
  );
}

const after = fs.readFileSync(gamePath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const javascript = manifest.extracted.javascript;
javascript.originalSha256 ??= javascript.sha256;
javascript.sha256 = hash(after);
javascript.bytes = after.length;
manifest.modifications = [
  {
    id: "mobile-hd-default",
    description: "Mobile auto-detection starts from the high quality preset.",
    dynamicResolutionFallback: true
  }
];
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      changed: !before.equals(after),
      beforeSha256: hash(before),
      afterSha256: hash(after),
      bytes: after.length
    },
    null,
    2,
  ),
);
