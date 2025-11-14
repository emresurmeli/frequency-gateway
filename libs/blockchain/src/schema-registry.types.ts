/**
 * Schema Registry Types
 * 
 * Domain models for schema metadata, caching, and batchability detection.
 * These types support dynamic schema discovery from the blockchain.
 */

/**
 * Payload location for schema content
 */
export enum PayloadLocation {
  /** Content stored on IPFS */
  IPFS = 'IPFS',
  /** Content stored directly on-chain */
  OnChain = 'OnChain',
  /** Content stored in itemized storage */
  Itemized = 'Itemized',
  /** Content stored in paginated storage */
  Paginated = 'Paginated',
}

/**
 * Schema model type (serialization format)
 */
export enum ModelType {
  /** Apache Parquet format (columnar storage) */
  Parquet = 'Parquet',
  /** Avro Binary format */
  AvroBinary = 'AvroBinary',
}

/**
 * Complete schema definition with metadata and batchability information
 */
export interface SchemaDefinition {
  /** Schema ID (1-65536) */
  schemaId: number;

  /** Schema namespace (e.g., "dsnp", "atproto") */
  namespace: string;

  /** Schema descriptor/name (e.g., "broadcast", "post") */
  descriptor: string;

  /** Schema version (e.g., "v1", "v2") */
  version: string;

  /** Full schema name in format "namespace.descriptor@version" */
  fullName: string;

  /** Where the payload content is stored */
  payloadLocation: PayloadLocation;

  /** Schema model/serialization format */
  model: ModelType;

  /** Whether this schema supports batching */
  batchable: boolean;

  /** Timestamp when this schema definition was fetched (milliseconds since epoch) */
  fetchedAt: number;
}

/**
 * Cache entry for schema lookup by ID
 */
export interface SchemaCacheEntry {
  /** The schema definition */
  schema: SchemaDefinition;

  /** Cache expiry timestamp (milliseconds since epoch) */
  expiresAt: number;
}

/**
 * Cache entry for schema name to ID mapping
 */
export interface SchemaNameCacheEntry {
  /** Full schema name */
  fullName: string;

  /** Schema ID */
  schemaId: number;

  /** Cache expiry timestamp (milliseconds since epoch) */
  expiresAt: number;
}

/**
 * Cache lookup key for schema by ID
 */
export interface SchemaIdLookupKey {
  schemaId: number;
}

/**
 * Cache lookup key for schema by name
 */
export interface SchemaNameLookupKey {
  namespace: string;
  descriptor: string;
  version?: string; // Optional - if not provided, returns latest version
}

/**
 * Options for schema registry operations
 */
export interface SchemaRegistryOptions {
  /** Cache TTL in seconds (default: 3600 = 1 hour) */
  cacheTtlSeconds?: number;

  /** Whether to pre-load known DSNP schemas at startup (default: true) */
  preloadDsnpSchemas?: boolean;

  /** Whether to use Redis for distributed caching (default: true) */
  useRedisCache?: boolean;
}

/**
 * Type guard to check if a value is a valid PayloadLocation
 */
export function isPayloadLocation(value: unknown): value is PayloadLocation {
  return (
    typeof value === 'string' &&
    Object.values(PayloadLocation).includes(value as PayloadLocation)
  );
}

/**
 * Type guard to check if a value is a valid ModelType
 */
export function isModelType(value: unknown): value is ModelType {
  return (
    typeof value === 'string' &&
    Object.values(ModelType).includes(value as ModelType)
  );
}

/**
 * Type guard to check if a value is a valid SchemaDefinition
 */
export function isSchemaDefinition(value: unknown): value is SchemaDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const schema = value as Partial<SchemaDefinition>;

  return (
    typeof schema.schemaId === 'number' &&
    schema.schemaId > 0 &&
    schema.schemaId <= 65536 &&
    typeof schema.namespace === 'string' &&
    schema.namespace.length > 0 &&
    typeof schema.descriptor === 'string' &&
    schema.descriptor.length > 0 &&
    typeof schema.version === 'string' &&
    schema.version.length > 0 &&
    typeof schema.fullName === 'string' &&
    schema.fullName.length > 0 &&
    isPayloadLocation(schema.payloadLocation) &&
    isModelType(schema.model) &&
    typeof schema.batchable === 'boolean' &&
    typeof schema.fetchedAt === 'number' &&
    schema.fetchedAt > 0
  );
}

/**
 * Helper to construct full schema name from components
 */
export function buildSchemaFullName(
  namespace: string,
  descriptor: string,
  version: string,
): string {
  return `${namespace}.${descriptor}@${version}`;
}

/**
 * Helper to parse full schema name into components
 * @returns Object with namespace, descriptor, and version, or null if invalid format
 */
export function parseSchemaFullName(
  fullName: string,
): { namespace: string; descriptor: string; version: string } | null {
  // Expected format: "namespace.descriptor@version"
  const match = fullName.match(/^([^.]+)\.([^@]+)@(.+)$/);
  if (!match) {
    return null;
  }

  const [, namespace, descriptor, version] = match;
  return { namespace, descriptor, version };
}

/**
 * Determine if a schema is batchable based on its payload location and model type
 * 
 * A schema is batchable if:
 * - Payload location is IPFS (content stored off-chain)
 * - Model type is Parquet or AvroBinary (supports batch serialization)
 */
export function isSchemaBatchable(
  payloadLocation: PayloadLocation,
  model: ModelType,
): boolean {
  return (
    payloadLocation === PayloadLocation.IPFS &&
    (model === ModelType.Parquet || model === ModelType.AvroBinary)
  );
}

/**
 * Create a SchemaDefinition from raw blockchain data
 */
export function createSchemaDefinition(params: {
  schemaId: number;
  namespace: string;
  descriptor: string;
  version: string;
  payloadLocation: PayloadLocation;
  model: ModelType;
}): SchemaDefinition {
  const { schemaId, namespace, descriptor, version, payloadLocation, model } = params;

  const fullName = buildSchemaFullName(namespace, descriptor, version);
  const batchable = isSchemaBatchable(payloadLocation, model);
  const fetchedAt = Date.now();

  return {
    schemaId,
    namespace,
    descriptor,
    version,
    fullName,
    payloadLocation,
    model,
    batchable,
    fetchedAt,
  };
}

/**
 * Create a cache entry for a schema definition
 */
export function createSchemaCacheEntry(
  schema: SchemaDefinition,
  ttlSeconds: number,
): SchemaCacheEntry {
  return {
    schema,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

/**
 * Create a cache entry for schema name to ID mapping
 */
export function createSchemaNameCacheEntry(
  fullName: string,
  schemaId: number,
  ttlSeconds: number,
): SchemaNameCacheEntry {
  return {
    fullName,
    schemaId,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
}

/**
 * Check if a cache entry has expired
 */
export function isCacheEntryExpired(entry: SchemaCacheEntry | SchemaNameCacheEntry): boolean {
  return Date.now() >= entry.expiresAt;
}

