const { app, ensureDbReady } = require('./app');

const PORT = process.env.PORT || 3001;

ensureDbReady()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB:', err);
    process.exit(1);
  });
