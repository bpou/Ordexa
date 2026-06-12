import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET_NAME!;
const ENDPOINT = process.env.S3_ENDPOINT;

if (!BUCKET) throw new Error("Missing S3_BUCKET_NAME");

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
});

export function resolveS3Key(keyOrUrl: string) {
  if (!keyOrUrl) return "";
  try {
    const url = new URL(keyOrUrl);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    const trimmed = keyOrUrl.trim();
    try {
      return decodeURIComponent(trimmed.replace(/^\/+/, ""));
    } catch {
      return trimmed.replace(/^\/+/, "");
    }
  }
}

export async function s3UploadObject(opts: {
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType ?? "application/octet-stream",
      CacheControl: "private, max-age=60",
    })
  );
}

export async function s3DeleteObject(key: string) {
  await s3.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: resolveS3Key(key) })
  );
}


export async function s3PresignGetUrl(key: string, expiresInSec = 600) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: resolveS3Key(key),
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

