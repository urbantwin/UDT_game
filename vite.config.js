import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certDir = path.join(__dirname, "certs");
const certPath = path.join(certDir, "dev-cert.pem");
const keyPath = path.join(certDir, "dev-key.pem");

const useHttps = process.env.DEV_HTTPS === "1" || process.env.DEV_HTTPS === "true";

function getHttpsConfig() {
  if (!useHttps) return false;
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error(
      "HTTPS dev certificates not found. Run `npm run https:setup` first."
    );
  }
  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
}

export default defineConfig({
  server: {
    host: true,
    https: getHttpsConfig(),
  },
});
