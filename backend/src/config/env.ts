import dotenv from "dotenv";

if (process.env.NODE_ENV === "test") {
    dotenv.config({ path: ".env.test" });
} else {
    dotenv.config();
}

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5000", 10),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    databaseHost: process.env.DATABASE_HOST || "localhost",
    databasePort: parseInt(process.env.DATABASE_PORT || "5432", 10),
    databaseUser: process.env.DATABASE_USER || "",
    databasePassword: process.env.DATABASE_PASSWORD || "",
    databaseName: process.env.DATABASE_NAME || "",
    jwtSecret: process.env.JWT_SECRET || "",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
    cashfreeMode: process.env.CASHFREE_MODE || "mock",
    cashfreeAppId: process.env.CASHFREE_APP_ID || "",
    cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || "",
    cashfreeWebhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || "",
    cashfreeApiVersion: process.env.CASHFREE_API_VERSION || "2025-01-01",
};
