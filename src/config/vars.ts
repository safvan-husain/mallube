export const config = {
    dbUrl: process.env.JWT_SECRET!,
    jwtSecret: process.env.JWT_SECRET!,
    port: process.env.PORT!,
    // environment,
    // frontendHost: process.env.FRONTEND_HOST!,
    // fattureCompanyId: process.env.FATTURE_COMPANY_ID!,
    // fattureToken: process.env.FATTURE_TOKEN!,
    // firebaseServiceAccount: firebase,
  
    // S3AssetBucket: process.env.S3_ASSET_BUCKET!,
    // S3AssetBucketRegion: process.env.S3_ASSET_BUCKET_REGION!,
    // assetsCdnBaseUrl: process.env.ASSETS_CDN_BASE_URL!,
    // smtp: {
    //   host: process.env.SMTP_HOST!,
    //   user: process.env.SMTP_USER!,
    //   password: process.env.SMTP_PASSWORD!,
    // },
  
    // isStaging: environment === systemConstants.ENVIRONMENTS.staging,
    // isProduction: environment === systemConstants.ENVIRONMENTS.production,
  };