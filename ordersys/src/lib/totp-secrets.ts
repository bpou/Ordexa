import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ENC_PREFIX = "enc.v1:";
const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOTP_ENCRYPTION_KEY is not configured");
  }

  cachedKey = createHash("sha256").update(raw).digest();
  return cachedKey;
}

export function hasTotpEncryptionKey(): boolean {
  return Boolean(process.env.TOTP_ENCRYPTION_KEY);
}

export function isEncryptedTotpSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export function encryptTotpSecret(secret: string): string {
  if (!secret) {
    throw new Error("Cannot encrypt empty TOTP secret");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, ciphertext]);

  return `${ENC_PREFIX}${payload.toString("base64url")}`;
}

export function decryptTotpSecret(
  stored: string | null | undefined
): string | null {
  if (!stored) return null;
  if (!isEncryptedTotpSecret(stored)) {
    return stored;
  }

  const payload = stored.slice(ENC_PREFIX.length);
  const data = Buffer.from(payload, "base64url");

  if (data.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Corrupted encrypted TOTP payload");
  }

  const key = getEncryptionKey();
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
