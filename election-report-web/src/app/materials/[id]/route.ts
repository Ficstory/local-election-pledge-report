import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { prisma } from "../../../lib/election-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MaterialRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MaterialRecord = {
  fileName: string | null;
  mimeType: string | null;
  sourceUrl: string | null;
  storagePath: string | null;
  title: string | null;
};

function pdfContentType(mimeType: string | null) {
  return mimeType?.toLowerCase().includes("pdf")
    ? "application/pdf"
    : (mimeType ?? "application/pdf");
}

function asciiFilename(fileName: string) {
  return fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
}

function inlineHeaders(material: MaterialRecord, contentLength?: number | string) {
  const fileName = material.fileName ?? `${material.title ?? "campaign-material"}.pdf`;
  const headers = new Headers({
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": `inline; filename="${asciiFilename(
      fileName
    )}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Content-Type": pdfContentType(material.mimeType),
    "X-Content-Type-Options": "nosniff"
  });

  if (contentLength) {
    headers.set("Content-Length", String(contentLength));
  }

  return headers;
}

function resolveStoragePath(storagePath: string) {
  const storageRoot = path.join(process.cwd(), "storage");
  const normalizedPath = path.normalize(storagePath);
  const storagePrefix = `storage${path.sep}`;
  const relativeStoragePath = normalizedPath.startsWith(storagePrefix)
    ? normalizedPath.slice(storagePrefix.length)
    : normalizedPath;
  const resolvedPath = path.join(storageRoot, relativeStoragePath);
  const relativePath = path.relative(storageRoot, resolvedPath);

  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    return undefined;
  }

  return resolvedPath;
}

async function localMaterialResponse(material: MaterialRecord) {
  if (!material.storagePath) {
    return undefined;
  }

  const resolvedPath = resolveStoragePath(material.storagePath);

  if (!resolvedPath) {
    return undefined;
  }

  try {
    const fileStat = await stat(resolvedPath);

    if (!fileStat.isFile()) {
      return undefined;
    }

    const stream = Readable.toWeb(createReadStream(resolvedPath)) as BodyInit;

    return new Response(stream, {
      headers: inlineHeaders(material, fileStat.size)
    });
  } catch {
    return undefined;
  }
}

async function remoteMaterialResponse(material: MaterialRecord) {
  if (!material.sourceUrl) {
    return undefined;
  }

  const response = await fetch(material.sourceUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/pdf"
    }
  });

  if (!response.ok) {
    return new Response("Failed to load material.", { status: 502 });
  }

  return new Response(response.body, {
    headers: inlineHeaders(
      material,
      response.headers.get("content-length") ?? undefined
    )
  });
}

export async function GET(_request: Request, context: MaterialRouteContext) {
  const { id } = await context.params;
  const material = await prisma.campaignMaterial.findUnique({
    select: {
      fileName: true,
      mimeType: true,
      sourceUrl: true,
      storagePath: true,
      title: true
    },
    where: {
      id
    }
  });

  if (!material) {
    return new Response("Material not found.", { status: 404 });
  }

  return (
    (await localMaterialResponse(material)) ??
    (await remoteMaterialResponse(material)) ??
    new Response("Material file is not available.", { status: 404 })
  );
}
