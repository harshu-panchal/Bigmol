import "dotenv/config";
import dns from "node:dns";

import app from "./app.js";
import connectDB from "./config/db.js";
import { validateEnv } from "./config/env.js";

const PORT = process.env.PORT || 5000;

// Force known public DNS resolvers to avoid local DNS issues (Atlas SRV lookups)
// - Enabled by default for `mongodb+srv://` URIs.
// - Set `FORCE_PUBLIC_DNS=false` to disable.
// - Set `FORCE_PUBLIC_DNS=true` to enable even for non-SRV URIs.
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];
const mongoUri = process.env.MONGO_URI;
const isMongoSrvUri = typeof mongoUri === "string" && mongoUri.startsWith("mongodb+srv://");
const forcePublicDns =
  process.env.FORCE_PUBLIC_DNS === "true" ||
  (process.env.FORCE_PUBLIC_DNS !== "false" && isMongoSrvUri);

if (forcePublicDns) {
  try {
    dns.setServers(PUBLIC_DNS_SERVERS);
    console.log(`[dns] Using public resolvers: ${PUBLIC_DNS_SERVERS.join(", ")}`);
  } catch (error) {
    console.warn("[dns] Failed to set custom resolvers:", error?.message || error);
  }
}

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("📦 Server startup failed:", error?.message || error);
    process.exit(1);
  }
};

startServer();
