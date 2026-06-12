import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type S3Config = {
  region: string;
  bucket: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let cachedS3Client: S3Client | null = null;
let cachedS3Config: S3Config | null = null;

function getS3Config(): S3Config {
  if (cachedS3Config) return cachedS3Config;

  const bucket = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket) {
    throw new Error("Missing S3_BUCKET_NAME");
  }

  if (!accessKeyId) {
    throw new Error("Missing AWS_ACCESS_KEY_ID");
  }

  if (!secretAccessKey) {
    throw new Error("Missing AWS_SECRET_ACCESS_KEY");
  }

  cachedS3Config = {
    region: process.env.AWS_REGION || "us-east-1",
    bucket,
    endpoint: process.env.S3_ENDPOINT,
    accessKeyId,
    secretAccessKey,
  };

  return cachedS3Config;
}

function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;

  const config = getS3Config();
  cachedS3Client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint
      ? { endpoint: config.endpoint, forcePathStyle: true }
      : {}),
  });

  return cachedS3Client;
}

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
  const { bucket } = getS3Config();
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType ?? "application/octet-stream",
      CacheControl: "private, max-age=60",
    })
  );
}

export async function s3DeleteObject(key: string) {
  const { bucket } = getS3Config();
  const s3 = getS3Client();
  await s3.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: resolveS3Key(key) })
  );
}


export async function s3PresignGetUrl(key: string, expiresInSec = 600) {
  const { bucket } = getS3Config();
  const s3 = getS3Client();
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: resolveS3Key(key),
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
}

