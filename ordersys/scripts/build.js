const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const isWindows = process.platform === "win32";
const distDir = path.join(projectRoot, ".next-build");
const nextExecutable = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  isWindows ? "next.cmd" : "next",
);

if (!fs.existsSync(nextExecutable)) {
  console.error(`[build] Could not find Next.js executable at ${nextExecutable}.`);
  process.exit(1);
}

fs.rmSync(distDir, { recursive: true, force: true });

const command = isWindows ? process.env.ComSpec || "cmd.exe" : nextExecutable;
const args = isWindows
  ? ["/c", nextExecutable, "build", "--turbopack"]
  : ["build", "--turbopack"];

const child = spawn(command, args, {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    ORDINA_DIST_DIR: ".next-build",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`[build] Failed to start build: ${error.message}`);
  process.exit(1);
});
