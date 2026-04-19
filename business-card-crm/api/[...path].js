const { app, ensureDbReady } = require('../server/app');

module.exports = async (req, res) => {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('Failed to init DB:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to initialize server' }));
    return;
  }

  return app(req, res);
};
