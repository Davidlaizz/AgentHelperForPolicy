import { spawn } from "node:child_process";

const command = process.argv.slice(2).join(" ");

if (!command) {
  console.error("Usage: node exec-devbox.mjs <command>");
  process.exit(1);
}

const child = spawn("ssh", ["devbox", command], {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
