const path = require("path");

module.exports = {
  apps: [
    {
      name: "m.eliteali.com",
      script: path.join(__dirname, "server.js"),
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3006,
      },
    },
  ],
};
