const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const tasksRoutes = require('./routes/tasks.routes');
const categoriesRoutes = require('./routes/categories.routes');
const adminRoutes = require('./routes/admin.routes');
const delegationRoutes = require('./routes/delegation.routes');
const activityRoutes = require('./routes/activity.routes');
const tokensRoutes = require('./routes/tokens.routes');
const { setupMcpRoutes } = require('./mcp/server');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required when behind nginx/reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});
app.use(limiter);

// MCP Server routes (SSE) - AVANT le body parser pour que le stream reste lisible
setupMcpRoutes(app);

// Body parser (après MCP pour ne pas consommer le body)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/delegations', delegationRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/tokens', tokensRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
