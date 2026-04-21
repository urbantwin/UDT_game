import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCA, createCert } from "mkcert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, "..");
const certDir = path.join(repoDir, "certs");

const certPath = path.join(certDir, "dev-cert.pem");
const keyPath = path.join(certDir, "dev-key.pem");
const caCertPath = path.join(certDir, "dev-ca-cert.pem");
const caKeyPath = path.join(certDir, "dev-ca-key.pem");

function getLanIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = new Set();

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (
        entry.family === "IPv4" &&
        !entry.internal &&
        !entry.address.startsWith("169.254.")
      ) {
        ips.add(entry.address);
      }
    }
  }

  return [...ips];
}

async function ensureCA() {
  const hasCA = await Promise.all([
    fs
      .access(caCertPath)
      .then(() => true)
      .catch(() => false),
    fs
      .access(caKeyPath)
      .then(() => true)
      .catch(() => false),
  ]);

  if (hasCA.every(Boolean)) {
    return {
      cert: await fs.readFile(caCertPath, "utf8"),
      key: await fs.readFile(caKeyPath, "utf8"),
    };
  }

  const ca = await createCA({
    organization: "UDT Game Dev CA",
    countryCode: "CH",
    state: "Vaud",
    locality: "Lausanne",
    validity: 3650,
  });

  await Promise.all([
    fs.writeFile(caCertPath, ca.cert, "utf8"),
    fs.writeFile(caKeyPath, ca.key, "utf8"),
  ]);

  return ca;
}

async function main() {
  await fs.mkdir(certDir, { recursive: true });

  const hosts = ["localhost", "127.0.0.1", "::1", ...getLanIPv4Addresses()];
  const uniqueHosts = [...new Set(hosts)];

  const ca = await ensureCA();
  const cert = await createCert({
    ca,
    domains: uniqueHosts,
    validity: 825,
  });

  await Promise.all([
    fs.writeFile(certPath, cert.cert, "utf8"),
    fs.writeFile(keyPath, cert.key, "utf8"),
  ]);

  console.log(`Generated certificate for: ${uniqueHosts.join(", ")}`);
  console.log(`Cert: ${certPath}`);
  console.log(`Key : ${keyPath}`);
  console.log(`CA  : ${caCertPath}`);
  console.log("If your browser marks it as untrusted, import the CA certificate into your OS trust store.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
