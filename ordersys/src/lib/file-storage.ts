import { del, put } from "@vercel/blob";
import { s3DeleteObject, s3PresignGetUrl, s3UploadObject } from "@/lib/s3";

const FILE_URL_TTL_SEC = 600;

export function isVercelBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
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

  await s3UploadObject(opts);
  const url = await s3PresignGetUrl(opts.key, FILE_URL_TTL_SEC);
  return {
    key: opts.key,
    url,
    expiresAt: Date.now() + FILE_URL_TTL_SEC * 1000,
  };
}

export async function deleteStoredFile(keyOrUrl: string) {
  if (isAbsoluteUrl(keyOrUrl) && keyOrUrl.includes(".blob.vercel-storage.com/")) {
    await del(keyOrUrl);
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

  return {
    url: await s3PresignGetUrl(keyOrUrl, expiresInSec),
    expiresAt: Date.now() + expiresInSec * 1000,
  };
}
