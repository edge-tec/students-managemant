const path = require("path");

const port = process.env.PORT || "3005";

module.exports = {
  apps: [
    {
      name: "m.eliteali.com",
      script: path.join(__dirname, "node_modules", "next", "dist", "bin", "next"),
      args: `start -p ${port}`,
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
