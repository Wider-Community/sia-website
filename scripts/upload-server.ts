/**
 * Lightweight upload API — receives files from the portal and stores them in R2.
 * Also serves as a download proxy for R2 files.
 *
 * Usage: npx tsx --env-file=../.env scripts/upload-server.ts
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

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

const app = new Hono();

app.use("/*", cors({ origin: "*" }));

// Upload: POST /upload?orgId=org-4&fileName=report.pdf
app.post("/upload", async (c) => {
  const orgId = c.req.query("orgId");
  const fileName = c.req.query("fileName");
  if (!orgId || !fileName) {
    return c.json({ error: "orgId and fileName query params required" }, 400);
  }

  const body = await c.req.arrayBuffer();
  const key = `orgs/${orgId}/${fileName}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: new Uint8Array(body),
    ContentType: c.req.header("content-type") ?? "application/octet-stream",
  }));

  return c.json({ key, size: body.byteLength });
});

// Download: GET /download?key=orgs/org-4/report.pdf
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

// List files for an org: GET /files?orgId=org-4
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

app.get("/health", (c) => c.json({ ok: true }));

console.log(`Upload server starting on port ${PORT}...`);
console.log(`  R2 Bucket: ${BUCKET}`);
console.log(`  R2 Endpoint: ${process.env.R2_ENDPOINT}`);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Upload server running at http://localhost:${PORT}`);
});
