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

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = String(value || "").split(":");
  if (version !== VERSION || !iv || !tag || !encrypted)
    throw new Error("Secret criptografado inválido");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
