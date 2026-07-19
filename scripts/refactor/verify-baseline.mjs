import { execFileSync } from "node:child_process";

const baseline = "5e8831b12e7528a4956ecae6953ad694609c3a20";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const head = git(["rev-parse", "HEAD"]);

try {
  execFileSync("git", ["merge-base", "--is-ancestor", baseline, head], {
    stdio: "ignore",
  });
} catch {
  console.error(`BASELINE_NOT_ANCESTOR baseline=${baseline} head=${head}`);
  process.exit(1);
}

const status = git(["status", "--porcelain"]);
if (status && process.env.ALLOW_DIRTY_WORKTREE !== "true") {
  console.error(`DIRTY_WORKTREE\n${status}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      baseline,
      head,
      clean: status.length === 0,
    },
    null,
    2,
  ),
);
