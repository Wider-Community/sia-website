/**
 * Lightweight upload API — receives files from the portal and stores them in R2.
 * Supports multi-tenant folder structure: {userId}/organizations/{orgId}-{slug}/files/
 *
 * Usage: npx tsx --env-file=.env scripts/upload-server.ts
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import { Resend } from "resend";

const PORT = Number(process.env.UPLOAD_SERVER_PORT ?? 4000);

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT ?? "",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "sia-data";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const app = new Hono();

app.use("/*", cors({ origin: "*" }));

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Upload: POST /upload?orgId=org-4&orgName=Mubadala&fileName=report.pdf&userId=user-1&path=contracts
app.post("/upload", async (c) => {
  const orgId = c.req.query("orgId");
  const fileName = c.req.query("fileName");
  if (!orgId || !fileName) {
    return c.json({ error: "orgId and fileName query params required" }, 400);
  }

  const userId = c.req.query("userId") ?? "user-1";
  const orgName = c.req.query("orgName") ?? orgId;
  const subPath = c.req.query("path") ?? "";

  const orgSlug = `${orgId}-${slugify(orgName)}`;
  const segments = [userId, "organizations", orgSlug];
  if (subPath) segments.push(...subPath.split("/").filter(Boolean));
  segments.push(fileName);

  const key = segments.join("/");
  const body = await c.req.arrayBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: new Uint8Array(body),
    ContentType: c.req.header("content-type") ?? "application/octet-stream",
  }));

  return c.json({ key, size: body.byteLength });
});

// Upload to user's personal folders: POST /upload/user?userId=user-1&folder=templates&fileName=nda.pdf
app.post("/upload/user", async (c) => {
  const userId = c.req.query("userId") ?? "user-1";
  const folder = c.req.query("folder") ?? "profile";
  const fileName = c.req.query("fileName");
  if (!fileName) return c.json({ error: "fileName query param required" }, 400);

  const key = `${userId}/${folder}/${fileName}`;
  const body = await c.req.arrayBuffer();

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: new Uint8Array(body),
    ContentType: c.req.header("content-type") ?? "application/octet-stream",
  }));

  return c.json({ key, size: body.byteLength });
});

// Copy file to a stage folder (for signing versioning)
// POST /copy?sourceKey=...&destKey=...
app.post("/copy", async (c) => {
  const sourceKey = c.req.query("sourceKey");
  const destKey = c.req.query("destKey");
  if (!sourceKey || !destKey) return c.json({ error: "sourceKey and destKey required" }, 400);

  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${sourceKey}`,
    Key: destKey,
  }));

  return c.json({ sourceKey, destKey });
});

// Download: GET /download?key=user-1/organizations/org-4-mubadala/report.pdf
app.get("/download", async (c) => {
  const key = c.req.query("key");
  if (!key) return c.json({ error: "key query param required" }, 400);

  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  c.header("Content-Type", resp.ContentType ?? "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
  return c.body(buffer);
});

// Browse: GET /browse?prefix=user-1/organizations/org-4-mubadala/
// Returns files and subfolders at a given level
app.get("/browse", async (c) => {
  const prefix = c.req.query("prefix") ?? "";
  const normalizedPrefix = prefix.endsWith("/") || prefix === "" ? prefix : `${prefix}/`;

  const resp = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: normalizedPrefix,
    Delimiter: "/",
  }));

  const folders = (resp.CommonPrefixes ?? []).map((p) => ({
    name: p.Prefix?.replace(normalizedPrefix, "").replace(/\/$/, "") ?? "",
    prefix: p.Prefix,
    type: "folder" as const,
  }));

  const files = (resp.Contents ?? [])
    .filter((obj) => obj.Key !== normalizedPrefix)
    .map((obj) => ({
      key: obj.Key,
      name: obj.Key?.replace(normalizedPrefix, "") ?? "",
      size: obj.Size,
      lastModified: obj.LastModified?.toISOString(),
      type: "file" as const,
    }));

  return c.json({ prefix: normalizedPrefix, folders, files });
});

// Legacy: List files for an org (backwards compatible)
// GET /files?orgId=org-4
app.get("/files", async (c) => {
  const orgId = c.req.query("orgId");
  const prefix = orgId ? `orgs/${orgId}/` : "orgs/";

  const resp = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  const files = (resp.Contents ?? []).map((obj) => ({
    key: obj.Key,
    name: obj.Key?.split("/").pop(),
    size: obj.Size,
    lastModified: obj.LastModified?.toISOString(),
  }));

  return c.json({ files });
});

// Create folder: POST /folder?path=user-1/organizations/org-4-mubadala/contracts
app.post("/folder", async (c) => {
  const path = c.req.query("path");
  if (!path) return c.json({ error: "path query param required" }, 400);

  const key = path.endsWith("/") ? path : `${path}/`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: new Uint8Array(0),
    ContentType: "application/x-directory",
  }));

  return c.json({ folder: key });
});

// Send email via Resend
// POST /send-email { to, subject, html, from? }
app.post("/send-email", async (c) => {
  if (!process.env.RESEND_API_KEY) {
    return c.json({ error: "RESEND_API_KEY not configured" }, 500);
  }

  const body = await c.req.json<{
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
  }>();

  if (!body.to || !body.subject || !body.html) {
    return c.json({ error: "to, subject, and html are required" }, 400);
  }

  const from = body.from ?? "SIA Platform <noreply@sia-platform.com>";

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(body.to) ? body.to : [body.to],
    subject: body.subject,
    html: body.html,
  });

  if (error) {
    console.error("Resend error:", error);
    return c.json({ error: error.message }, 500);
  }

  return c.json({ id: data?.id, status: "sent" });
});

app.get("/health", (c) => c.json({ ok: true }));

console.log(`Upload server starting on port ${PORT}...`);
console.log(`  R2 Bucket: ${BUCKET}`);
console.log(`  R2 Endpoint: ${process.env.R2_ENDPOINT}`);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Upload server running at http://localhost:${PORT}`);
});
