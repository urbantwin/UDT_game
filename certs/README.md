Development HTTPS certificates are generated locally with the npm `mkcert` package.

Do not commit private keys.

Files generated in this folder:
- `dev-cert.pem`
- `dev-key.pem`
- `dev-ca-cert.pem`
- `dev-ca-key.pem`

Steps:
1. Run `npm run https:setup`
2. Trust `certs/dev-ca-cert.pem` in your OS/browser trust store if needed
3. Run `npm run dev:https` (or `npm run dev:full:https`)
4. Open `https://<your-lan-ip>:5173` on your phone
