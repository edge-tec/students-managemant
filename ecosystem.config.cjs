module.exports = {
  apps: [
    {
      name: "app.eliteali.com",
      script: "npm",
      args: "start -- -p 3005",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
    },
  ],
};
