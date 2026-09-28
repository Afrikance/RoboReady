CREATE TABLE "blog_post" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "excerpt" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL DEFAULT 'field-notes',
  "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "authorName" text NOT NULL,
  "authorRole" text,
  "sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "seoTitle" text,
  "seoDescription" text,
  "canonicalUrl" text,
  "status" text NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'scheduled', 'published', 'archived')),
  "creationSource" text NOT NULL DEFAULT 'manual' CHECK ("creationSource" IN ('manual', 'staffgpt')),
  "externalIdempotencyKey" text UNIQUE,
  "scheduledAt" timestamp without time zone,
  "publishedAt" timestamp without time zone,
  "createdByUserId" text,
  "updatedByUserId" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX "blog_post_status_published_idx" ON "blog_post" ("status", "publishedAt");
CREATE INDEX "blog_post_category_status_idx" ON "blog_post" ("category", "status");

CREATE TABLE "blog_media" (
  "id" text PRIMARY KEY,
  "postId" text NOT NULL REFERENCES "blog_post"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "pathname" text,
  "contentType" text NOT NULL,
  "mediaType" text NOT NULL CHECK ("mediaType" IN ('image', 'video')),
  "altText" text NOT NULL DEFAULT '',
  "caption" text,
  "transcript" text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now()
);
CREATE INDEX "blog_media_post_sort_idx" ON "blog_media" ("postId", "sortOrder");

CREATE TABLE "blog_settings" (
  "id" text PRIMARY KEY DEFAULT 'global' CHECK ("id" = 'global'),
  "visible" boolean NOT NULL DEFAULT false,
  "staffgptAutoPublish" boolean NOT NULL DEFAULT false,
  "updatedByUserId" text,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);
INSERT INTO "blog_settings" ("id", "visible", "staffgptAutoPublish") VALUES ('global', false, false) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "blog_api_rate_bucket" (
  "rateKey" text NOT NULL,
  "bucketStart" timestamp without time zone NOT NULL,
  "requestCount" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("rateKey", "bucketStart")
);
CREATE INDEX "blog_api_rate_bucket_start_idx" ON "blog_api_rate_bucket" ("bucketStart");

-- Blog media is public only when a published post links to it; Vercel Blob holds the source files.
-- Blog content remains server-managed so no public table access is exposed directly.
-- Rollback: DROP TABLE blog_api_rate_bucket, blog_settings, blog_media, blog_post;
