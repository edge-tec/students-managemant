// start.js - Reliable PM2 launcher for Next.js production
const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || "3005";
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

console.log(`> Launching Next.js production server on http://0.0.0.0:${port}`);

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "0.0.0.0"], {
  stdio: "inherit",
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
  },
});

const handleTermination = (signal) => {
  console.log(`> Received ${signal}, gracefully shutting down Next.js...`);
  child.kill(signal);
};

process.on("SIGTERM", () => handleTermination("SIGTERM"));
process.on("SIGINT", () => handleTermination("SIGINT"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code || 0);
  }
});
