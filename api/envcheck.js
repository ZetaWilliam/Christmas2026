module.exports = async function handler(req, res) {
  res.status(200).json({
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    adminPasscodePresent: Boolean(process.env.ADMIN_PASSCODE),
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelProject: process.env.VERCEL_PROJECT_PRODUCTION_URL || null
  });
};
