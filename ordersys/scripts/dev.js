const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const projectRoot = path.join(__dirname, "..");
const isWindows = process.platform === "win32";

const nextExecutable = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  isWindows ? "next.cmd" : "next",
);

function ensureExecutableExists(executablePath, label) {
  if (!fs.existsSync(executablePath)) {
    console.error(
      `[dev] Could not find ${label} executable at ${executablePath}.`,
    );
    process.exit(1);
  }
}

ensureExecutableExists(nextExecutable, "Next.js");

const processes = [];
let shuttingDown = false;
let nextProcess;

function registerProcess(child) {
  processes.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (child === nextProcess) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
      console.log(`[dev] Next.js process exited (${reason}), shutting down.`);
      shutdown(code ?? 0);
    }
  });
}

function terminate(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore kill errors; process might have already stopped.
  }
}

function hardTerminate(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  try {
    child.kill("SIGKILL");
  } catch {
    // On Windows SIGKILL maps to taskkill; ignore failures.
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  processes.forEach(terminate);

  setTimeout(() => {
    processes.forEach(hardTerminate);
    process.exit(exitCode);
  }, 1500);
}

function startProcess(label, command, args, options = {}) {
  const spawnOptions = {
    stdio: "inherit",
    ...options,
  };

  let finalCommand = command;
  let finalArgs = args;

  if (isWindows && path.extname(command).toLowerCase() === ".cmd") {
    finalCommand = process.env.ComSpec || "cmd.exe";
    finalArgs = ["/c", command, ...args];
  }

  try {
    const child = spawn(finalCommand, finalArgs, spawnOptions);
    child.on("error", (error) => {
      console.error(`[dev] ${label} error: ${error.message}`);
      shutdown(1);
    });
    return child;
  } catch (error) {
    console.error(`[dev] Failed to start ${label}: ${error.message}`);
    shutdown(1);
    return null;
  }
}

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal && !address.address.startsWith("172.")) {
        return address.address;
      }
    }
  }
  return null;
}

const devHost = "0.0.0.0";
const devPort = process.env.PORT || "3000";
const detectedLanAddress = getLanAddress();
const defaultAuthUrl = `http://${detectedLanAddress || "localhost"}:${devPort}`;
const configuredAuthUrl = process.env.NEXTAUTH_URL || "";
const nextAuthUrl =
  configuredAuthUrl && !configuredAuthUrl.includes("ordina.se")
    ? configuredAuthUrl
    : defaultAuthUrl;

console.log(`[dev] Local: http://localhost:${devPort}`);
if (detectedLanAddress) {
  console.log(`[dev] Network: http://${detectedLanAddress}:${devPort}`);
}
console.log(`[dev] NextAuth URL: ${nextAuthUrl}`);

nextProcess = startProcess(
  "Next.js",
  nextExecutable,
  ["dev", "--turbopack", "-H", devHost, "-p", devPort],
  {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXTAUTH_URL: nextAuthUrl,
      ORDINA_DEV_ORIGIN: detectedLanAddress || "",
    },
    cwd: projectRoot,
  },
);

if (!nextProcess) {
  process.exit(1);
}

registerProcess(nextProcess);

function handleSignal(signal) {
  return () => {
    console.log(`[dev] Received ${signal}, shutting down.`);
    shutdown(0);
  };
}

process.on("SIGINT", handleSignal("SIGINT"));
process.on("SIGTERM", handleSignal("SIGTERM"));
process.on("SIGBREAK", handleSignal("SIGBREAK"));
process.on("exit", () => shutdown(0));
