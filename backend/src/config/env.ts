import dotenv from "dotenv";
dotenv.config({ override: true });

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3309/goeats",
  JWT_SECRET: process.env.JWT_SECRET || "2GrGBfroFwsse0krmg4geOjlUp/UvjQWrpgsgiyh1BM=",
  NODE_ENV: process.env.NODE_ENV || "development",
  
  SMTP_HOST: process.env.SMTP_HOST || "server3651.hostingsupremo.net",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
  SMTP_SECURE: process.env.SMTP_SECURE !== "false",
  SMTP_USER: process.env.SMTP_USER || "gerencia@guibis.com",
  SMTP_PASS: process.env.SMTP_PASS || "MACAra666_",
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || "GoEats",

  // OAuth Credentials
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || "",
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || "",

  // Gmail API OAuth2
  GMAIL_USER: process.env.GMAIL_USER || "",
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID || "",
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || "",
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN || "",
};

