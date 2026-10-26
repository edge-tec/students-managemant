const path = require("path");

const port = process.env.PORT || "3005";
const appName = process.env.APP_NAME || process.env.DOMAIN || "m.eliteali.com";

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(__dirname, "start.js"),
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
