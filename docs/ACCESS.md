# Доступ к серверу bytoloto.com

ВНИМАНИЕ: это root-доступ к продакшен-серверу. Репозиторий приватный; удалите этот файл и ключ из authorized_keys на сервере, когда доступ больше не нужен.

- Хост: `31.77.189.137`
- Пользователь: `root`
- Каталог проекта: `/opt/bytoloto`

## Как подключиться

```bash
mkdir -p ~/.ssh && cat > ~/.ssh/bytoloto_tmp <<'KEY'
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCjc5p/zv5b7n+13k3a2pm9EiuzCrDj685w4oNkAAZN+wAAAJgyFU+/MhVP
vwAAAAtzc2gtZWQyNTUxOQAAACCjc5p/zv5b7n+13k3a2pm9EiuzCrDj685w4oNkAAZN+w
AAAEBXF0XeXsVQiwnIXtVaphPIkSNK2dQhvjRnpjWnFRrNsKNzmn/O/lvuf7XeTdramb0S
K7MKsOPrznDig2QABk37AAAAEHYwLXRlbXAtYnl0b2xvdG8BAgMEBQ==
-----END OPENSSH PRIVATE KEY-----
KEY
chmod 600 ~/.ssh/bytoloto_tmp
ssh -i ~/.ssh/bytoloto_tmp -o StrictHostKeyChecking=accept-new root@31.77.189.137
```

## Отзыв доступа

На сервере удалите строку с этим публичным ключом из `/root/.ssh/authorized_keys`:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKNzmn/O/lvuf7XeTdramb0SK7MKsOPrznDig2QABk37 v0-temp-bytoloto
```
