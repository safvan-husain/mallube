export const config = {
    jwtSecret: process.env.JWT_SECRET! || "mallumart@12345" ,
    port: process.env.PORT! || "4000",

    //s3
    s3BaseUrl: process.env.S3_BASE_URL,
    s3AccessKey: process.env.S3_ACCESS_KEY,
    s3SecretsKey : process.env.S3_SECRET_KEY,

    //twilio
    twilioAccountSid:process.env.TWILIO_ACCOUNT_SID, 
    twilioAuthtoken: process.env.TWILIO_AUTHTOKEN,
    twilioServiceId: process.env.TWILIO_SERVICE_ID,
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