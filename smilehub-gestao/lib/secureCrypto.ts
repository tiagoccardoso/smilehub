import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getEncryptionSecret() {
  const secret =
    process.env.NFSE_CERTIFICATE_ENCRYPTION_KEY ||
    process.env.NEON_AUTH_COOKIE_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Chave de criptografia ausente");
  return secret;
}

function getKey() {
  return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

export function encryptSecret(value: string | Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}
