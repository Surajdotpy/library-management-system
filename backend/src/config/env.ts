import './load-env.ts';

function readEnvString(...keys: string[]): string {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
            return value;
        }
    }

    return "";
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
    cashfreeMode: process.env.CASHFREE_MODE?.trim() || "mock",
    cashfreeAppId: readEnvString("CASHFREE_APP_ID", "CASHFREE_CLIENT_ID"),
    cashfreeSecretKey: readEnvString("CASHFREE_SECRET_KEY", "CASHFREE_CLIENT_SECRET"),
    cashfreeWebhookSecret: readEnvString("CASHFREE_WEBHOOK_SECRET"),
    cashfreeApiVersion: readEnvString("CASHFREE_API_VERSION") || "2023-08-01",
};
