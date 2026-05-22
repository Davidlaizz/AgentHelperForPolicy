import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { NodeSSH } from "node-ssh";

const ssh = new NodeSSH();

const publicKeyPath = path.join(os.homedir(), ".ssh", "codex_devbox_ed25519.pub");
const publicKey = (await fs.readFile(publicKeyPath, "utf8")).trim();

await ssh.connect({
  host: "192.168.216.101",
  port: 22,
  username: "root",
  password: "123456",
  tryKeyboard: true,
  readyTimeout: 20000,
});

await ssh.execCommand("mkdir -p ~/.ssh && chmod 700 ~/.ssh");
await ssh.execCommand(
  `grep -qxF '${publicKey}' ~/.ssh/authorized_keys 2>/dev/null || echo '${publicKey}' >> ~/.ssh/authorized_keys`
);
await ssh.execCommand("chmod 600 ~/.ssh/authorized_keys");

const hostname = await ssh.execCommand("hostname");
const osInfo = await ssh.execCommand("uname -a");
const dockerInfo = await ssh.execCommand("docker --version || true");
const composeInfo = await ssh.execCommand("docker compose version || docker-compose --version || true");

console.log(
  JSON.stringify(
    {
      hostname: hostname.stdout.trim(),
      os: osInfo.stdout.trim(),
      docker: dockerInfo.stdout.trim(),
      compose: composeInfo.stdout.trim(),
    },
    null,
    2
  )
);

ssh.dispose();

