import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "mysql://root:@localhost:3306/goeats",
  JWT_SECRET: process.env.JWT_SECRET || "goeats_super_secret_key_sri_saas_2026",
  NODE_ENV: process.env.NODE_ENV || "development",
  
  SMTP_HOST: process.env.SMTP_HOST || "server3651.hostingsupremo.net",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "465", 10),
  SMTP_SECURE: process.env.SMTP_SECURE !== "false",
  SMTP_USER: process.env.SMTP_USER || "gerencia@guibis.com",
  SMTP_PASS: process.env.SMTP_PASS || "MACAra666_",
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || "GoEats",
};
