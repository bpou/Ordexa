import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteStoredFile,
  isVercelBlobConfigured,
  uploadStoredFile,
} from "@/lib/file-storage";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_UPLOAD_URL_PREFIX = "/uploads/profiles/";
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function getUploadDir() {
  return path.join(process.cwd(), "public", "uploads", "profiles");
}

function getLocalProfilePath(url: string | null | undefined, userId: string) {
  if (!url?.startsWith(PROFILE_UPLOAD_URL_PREFIX)) return null;
  const filename = path.basename(url);
  if (!filename || filename === "default-avatar.png") return null;
  if (!filename.startsWith(`${userId}-`)) return null;
  return path.join(getUploadDir(), filename);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;

  if (!session || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Saknar bildfil" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Tillatna format ar JPG, PNG, WebP och GIF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Bilden far vara max 5 MB" },
      { status: 400 }
    );
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!current) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const uploadDir = getUploadDir();
  const filename = `${userId}-${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  let imageUrl: string;

  if (isVercelBlobConfigured()) {
    const uploaded = await uploadStoredFile({
      key: `profiles/${filename}`,
      body: buffer,
      contentType: file.type,
    });
    imageUrl = uploaded.url;
  } else {
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: "Profilbildsuppladdning saknar BLOB_READ_WRITE_TOKEN i produktion." },
        { status: 500 }
      );
    }

    await mkdir(uploadDir, { recursive: true });
    const relativeUrl = `${PROFILE_UPLOAD_URL_PREFIX}${filename}`;
    const destination = path.join(uploadDir, filename);
    await writeFile(destination, buffer);
    imageUrl = relativeUrl;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: { image: true },
  });

  const previousPath = getLocalProfilePath(current.image, userId);
  if (previousPath) {
    try {
      await unlink(previousPath);
    } catch {
      // Best effort cleanup only; a missing old avatar should not fail upload.
    }
  } else if (current.image?.includes(".blob.vercel-storage.com/")) {
    try {
      await deleteStoredFile(current.image);
    } catch {
      // Best effort cleanup only; a missing old avatar should not fail upload.
    }
  }

  return NextResponse.json({ ok: true, image: user.image });
}
