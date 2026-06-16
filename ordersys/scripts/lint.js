const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const isWindows = process.platform === "win32";
const eslintExecutable = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  isWindows ? "eslint.cmd" : "eslint",
);

if (!fs.existsSync(eslintExecutable)) {
  console.error(`[lint] Could not find ESLint executable at ${eslintExecutable}.`);
  process.exit(1);
}

const targets = [
  "src",
  "tests",
  "scripts",
  "next.config.ts",
  "eslint.config.mjs",
  "postcss.config.js",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "capacitor.config.ts",
];

const command = isWindows ? process.env.ComSpec || "cmd.exe" : eslintExecutable;
const args = isWindows ? ["/c", eslintExecutable, ...targets] : targets;

const child = spawn(command, args, {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`[lint] Failed to start lint: ${error.message}`);
  process.exit(1);
});
