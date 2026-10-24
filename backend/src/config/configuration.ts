export default () => ({
  port: parseInt(process.env.PORT, 10) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'karyasaarthi_jwt_access_secret_key_2026_dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'karyasaarthi_jwt_refresh_secret_key_2026_dev',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  integrations: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
});
