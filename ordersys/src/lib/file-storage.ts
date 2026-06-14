import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  isS3Configured,
  s3DeleteObject,
  s3PresignGetUrl,
  s3UploadObject,
} from "@/lib/s3";

const FILE_URL_TTL_SEC = 600;
const DB_STORAGE_PREFIX = "db:";
let storedFileTablePromise: Promise<void> | null = null;

export function isVercelBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function encodeStorageKey(key: string) {
  return Buffer.from(key, "utf8").toString("base64url");
}

function decodeStorageKey(encoded: string) {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

export function getDatabaseStoredFileUrl(key: string) {
  return `/api/stored-files/${encodeStorageKey(key)}`;
}

export function decodeDatabaseStoredFileKey(encodedKey: string) {
  return decodeStorageKey(encodedKey);
}

function extractDatabaseStoredFileKey(value: string) {
  if (isDatabaseStoredFileKey(value)) return value;
  const match = value.match(/\/api\/stored-files\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeDatabaseStoredFileKey(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function isDatabaseStoredFileKey(value: string) {
  return value.startsWith(DB_STORAGE_PREFIX);
}

export async function ensureDatabaseStoredFileTable() {
  storedFileTablePromise ??= prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."StoredFile" (
      "key" TEXT NOT NULL,
      "body" BYTEA NOT NULL,
      "contentType" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
    )
  `).then(() => undefined);

  await storedFileTablePromise;
}

export async function uploadStoredFile(opts: {
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  if (isVercelBlobConfigured()) {
    const blob = await put(opts.key, opts.body, {
      access: "public",
      contentType: opts.contentType ?? "application/octet-stream",
      addRandomSuffix: false,
    });

    return {
      key: blob.url,
      url: blob.url,
      expiresAt: null,
    };
  }

  if (isS3Configured()) {
    await s3UploadObject(opts);
    const url = await s3PresignGetUrl(opts.key, FILE_URL_TTL_SEC);
    return {
      key: opts.key,
      url,
      expiresAt: Date.now() + FILE_URL_TTL_SEC * 1000,
    };
  }

  const key = `${DB_STORAGE_PREFIX}${opts.key}`;
  await ensureDatabaseStoredFileTable();
  await prisma.storedFile.upsert({
    where: { key },
    update: {
      body: opts.body,
      contentType: opts.contentType ?? "application/octet-stream",
    },
    create: {
      key,
      body: opts.body,
      contentType: opts.contentType ?? "application/octet-stream",
    },
  });

  return {
    key,
    url: getDatabaseStoredFileUrl(key),
    expiresAt: null,
  };
}

export async function deleteStoredFile(keyOrUrl: string) {
  if (isAbsoluteUrl(keyOrUrl) && keyOrUrl.includes(".blob.vercel-storage.com/")) {
    await del(keyOrUrl);
    return;
  }

  const databaseKey = extractDatabaseStoredFileKey(keyOrUrl);
  if (databaseKey) {
    await prisma.storedFile.deleteMany({ where: { key: databaseKey } });
    return;
  }

  if (!isS3Configured()) {
    return;
  }

  await s3DeleteObject(keyOrUrl);
}

export async function getStoredFileUrl(keyOrUrl: string, expiresInSec = FILE_URL_TTL_SEC) {
  if (isAbsoluteUrl(keyOrUrl)) {
    return {
      url: keyOrUrl,
      expiresAt: null,
    };
  }

  const databaseKey = extractDatabaseStoredFileKey(keyOrUrl);
  if (databaseKey) {
    return {
      url: getDatabaseStoredFileUrl(databaseKey),
      expiresAt: null,
    };
  }

  if (!isS3Configured()) {
    throw new Error("No file storage backend is configured for this file.");
  }

  return {
    url: await s3PresignGetUrl(keyOrUrl, expiresInSec),
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}
