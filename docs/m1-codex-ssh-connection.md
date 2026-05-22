# Codex App SSH 连接记录

## 已完成配置

本机已创建并验证以下 SSH Host：

```sshconfig
Host devbox
    HostName 192.168.216.101
    User root
    Port 22
    IdentityFile ~/.ssh/codex_devbox_ed25519
    IdentitiesOnly yes
    PreferredAuthentications publickey,password
    StrictHostKeyChecking no
```

对应本地文件：

- `C:\Users\User\.ssh\config`
- `C:\Users\User\.ssh\codex_devbox_ed25519`
- `C:\Users\User\.ssh\codex_devbox_ed25519.pub`

## 验证结果

已验证以下命令可用：

```bash
ssh devbox "echo connected && hostname && whoami"
```

说明：

- 已完成公钥写入远端 `authorized_keys`
- 当前已经可以免密连接虚拟机

## Codex App 使用方式

在 Codex App 中：

1. 打开 `Settings`
2. 进入 `Connections`
3. 选择或添加 SSH Host `devbox`
4. 远程目录建议选择：

```text
/opt/zhicetong
```

如果你希望直接进入某个业务代码目录，也可以改成对应目录。

