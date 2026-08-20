/** PM2 — production frontend MDISCOVER */
module.exports = {
  apps: [
    {
      name: 'mdiscover-web',
      cwd: __dirname,
      script: 'node_modules/.bin/next',
      args: 'start -H 127.0.0.1 -p 3101',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
