/**
 * Portfolio demo API — presale core only. Configure via environment variables.
 */

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const customerRoutes = require('./routes/customerRoutes');
const presaleRoutes = require('./routes/presaleRoutes');
const stageRoutes = require('./routes/stageRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const walletCustomerRoutes = require('./routes/walletCustomerRoutes');
const priceRoutes = require('./routes/priceRoutes');
const stakeRoutes = require('./routes/stakeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tokenClaimRoutes = require('./routes/tokenClaimRoutes');
const emailRoutes = require('./routes/emailRoutes');
const walletRoutes = require('./routes/walletRoutes');
const wertRoutes = require('./routes/wertRoutes');
const twitterRoutes = require('./routes/twitterRoutes');
const vipReferralRoutes = require('./routes/vipreferralRoutes');
const { initBlockchainListeners } = require('./listeners/blockchainListener');
const { initStakingListener } = require('./listeners/stakingListener');
const { initStakingService, checkAndUpdateMaturedStakes } = require('./services/stakingService');
const { startPresaleListener } = require('./listeners/presaleListener');
const { initTokenClaimListeners } = require('./listeners/tokenClaimListener');
const { setupReferralListeners } = require('./listeners/referralListener');
const solanaPaymentListener = require('./listeners/solanaPaymentListener');
const cors = require('cors');
const schemas = require('./swaggerSchemas');

dotenv.config();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Metanews API (portfolio demo)',
      version: '1.0.0',
      description: 'Demo presale API — not production.'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer <token>'
        }
      },
      schemas
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
app.use(
  cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showRequestHeaders: true
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Presale API (demo)'
  })
);

const mongoUri = process.env.MONGODB_URI;
mongoose
  .connect(mongoUri || 'mongodb://127.0.0.1:27017/metanews_portfolio_demo')
  .then(() => {
    console.log('Connected to MongoDB');

    try {
      initBlockchainListeners();
      initStakingListener();
      initStakingService();
      initTokenClaimListeners();
      startPresaleListener();
      setupReferralListeners();
      solanaPaymentListener.startListening();
      const stageService = require('./services/stageService');
      stageService.startStageTimeScheduler();
      setInterval(async () => {
        try {
          await checkAndUpdateMaturedStakes();
        } catch (error) {
          console.error('Matured stakes check:', error.message);
        }
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to initialize services:', error.message);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('App will run without database functionality');
  });

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

app.use('/api/customers', customerRoutes);
app.use('/api/presales', presaleRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/wallet-customers', walletCustomerRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/staking', stakeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/token-claim', tokenClaimRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wert', wertRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/vip-referral', vipReferralRoutes);

app.get('/', (_req, res) => {
  res.json({
    message: 'Presale API (portfolio demo)',
    documentation: 'Visit /api-docs'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api-docs`);
});
