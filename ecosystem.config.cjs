// PM2 process file for the VPS: `pm2 start ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: "lotery-promo",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
