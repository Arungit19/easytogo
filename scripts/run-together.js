const { spawn } = require("node:child_process");

const mode = process.argv[2];

if (!mode) {
  console.error("Usage: node scripts/run-together.js <dev|start>");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const apps = getApps(mode);
let stopping = false;

const children = apps.map(({ name, script }) => {
  const child = spawn(npmCommand, ["run", script], {
    cwd: ".",
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (stopping) {
      return;
    }

    stopping = true;
    stopChildren(child.pid);

    if (signal) {
      console.error(`${name} stopped with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code || 0);
  });

  return child;
});

function getApps(scriptMode) {
  if (scriptMode === "dev") {
    return [
      { name: "frontend", script: "dev" },
      { name: "backend", script: "backend:dev" },
    ];
  }

  if (scriptMode === "start") {
    return [
      { name: "frontend", script: "start" },
      { name: "backend", script: "backend:start" },
    ];
  }

  console.error(`Unsupported mode: ${scriptMode}`);
  process.exit(1);
}

function stopChildren(exceptPid) {
  for (const child of children) {
    if (child.pid !== exceptPid && !child.killed) {
      child.kill();
    }
  }
}

function shutdown() {
  if (stopping) {
    return;
  }

  stopping = true;
  stopChildren();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
