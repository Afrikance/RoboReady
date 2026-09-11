import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Better Auth tables (camelCase columns are required by Better Auth defaults)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// RoboReady tenancy layer
// ---------------------------------------------------------------------------

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdByUserId: text("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const membership = pgTable(
  "membership",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull(),
    userId: text("userId").notNull(),
    // owner | admin | member | client
    role: text("role").notNull().default("member"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    orgUser: unique().on(t.organizationId, t.userId),
  }),
)

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId"),
  userId: text("userId"),
  action: text("action").notNull(),
  entityType: text("entityType"),
  entityId: text("entityId"),
  metadata: jsonb("metadata"),
  ipAddress: text("ipAddress"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// RoboReady domain
// ---------------------------------------------------------------------------

export const property = pgTable("property", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  name: text("name").notNull(),
  propertyType: text("propertyType").notNull().default("commercial"),
  addressLine1: text("addressLine1"),
  addressLine2: text("addressLine2"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postalCode"),
  country: text("country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  squareFootage: integer("squareFootage"),
  floors: integer("floors"),
  yearBuilt: integer("yearBuilt"),
  // intake | assessing | assessed | proposal | active
  status: text("status").notNull().default("intake"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const intakeSubmission = pgTable("intake_submission", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  answers: jsonb("answers").notNull().default({}),
  status: text("status").notNull().default("draft"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const document = pgTable("document", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  url: text("url").notNull(),
  contentType: text("contentType"),
  sizeBytes: integer("sizeBytes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const aiJob = pgTable("ai_job", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId"),
  createdByUserId: text("createdByUserId").notNull(),
  employeeSlug: text("employeeSlug").notNull(),
  employeeName: text("employeeName").notNull(),
  jobType: text("jobType").notNull(),
  // queued | running | needs_approval | approved | completed | failed
  status: text("status").notNull().default("queued"),
  // local | staffgpt
  adapterKind: text("adapterKind").notNull().default("local"),
  input: jsonb("input"),
  output: jsonb("output"),
  rawResponse: jsonb("rawResponse"),
  reasoning: text("reasoning"),
  requiresApproval: boolean("requiresApproval").notNull().default(false),
  approvedByUserId: text("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  errorDetail: text("errorDetail"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const assessment = pgTable("assessment", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  status: text("status").notNull().default("draft"),
  roboReadyScore: integer("roboReadyScore"),
  scoreBreakdown: jsonb("scoreBreakdown"),
  findings: jsonb("findings"),
  recommendations: jsonb("recommendations"),
  summary: text("summary"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const siteConcept = pgTable("site_concept", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  assessmentId: text("assessmentId"),
  createdByUserId: text("createdByUserId").notNull(),
  aiJobId: text("aiJobId"),
  title: text("title").notNull(),
  narrative: text("narrative"),
  zones: jsonb("zones"),
  imageUrl: text("imageUrl"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const infrastructureAsset = pgTable("infrastructure_asset", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId").notNull(),
  propertyId: text("propertyId").notNull(),
  createdByUserId: text("createdByUserId").notNull(),
  // ev_charger | landing_pad | robo_charge | drone_pad (expandable)
  assetType: text("assetType").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("proposed"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  quantity: integer("quantity").notNull().default(1),
  unitCost: numeric("unitCost", { precision: 12, scale: 2 }),
  specs: jsonb("specs"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})
