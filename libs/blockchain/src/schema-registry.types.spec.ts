import {
  PayloadLocation,
  ModelType,
  SchemaDefinition,
  SchemaCacheEntry,
  SchemaNameCacheEntry,
  isPayloadLocation,
  isModelType,
  isSchemaDefinition,
  buildSchemaFullName,
  parseSchemaFullName,
  isSchemaBatchable,
  createSchemaDefinition,
  createSchemaCacheEntry,
  createSchemaNameCacheEntry,
  isCacheEntryExpired,
} from './schema-registry.types';

describe('Schema Registry Types', () => {
  describe('PayloadLocation enum', () => {
    it('should have correct values', () => {
      expect(PayloadLocation.IPFS).toBe('IPFS');
      expect(PayloadLocation.OnChain).toBe('OnChain');
      expect(PayloadLocation.Itemized).toBe('Itemized');
      expect(PayloadLocation.Paginated).toBe('Paginated');
    });
  });

  describe('ModelType enum', () => {
    it('should have correct values', () => {
      expect(ModelType.Parquet).toBe('Parquet');
      expect(ModelType.AvroBinary).toBe('AvroBinary');
    });
  });

  describe('isPayloadLocation', () => {
    it('should return true for valid PayloadLocation values', () => {
      expect(isPayloadLocation('IPFS')).toBe(true);
      expect(isPayloadLocation('OnChain')).toBe(true);
      expect(isPayloadLocation('Itemized')).toBe(true);
      expect(isPayloadLocation('Paginated')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isPayloadLocation('Invalid')).toBe(false);
      expect(isPayloadLocation('')).toBe(false);
      expect(isPayloadLocation(null)).toBe(false);
      expect(isPayloadLocation(undefined)).toBe(false);
      expect(isPayloadLocation(123)).toBe(false);
      expect(isPayloadLocation({})).toBe(false);
    });
  });

  describe('isModelType', () => {
    it('should return true for valid ModelType values', () => {
      expect(isModelType('Parquet')).toBe(true);
      expect(isModelType('AvroBinary')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isModelType('Invalid')).toBe(false);
      expect(isModelType('')).toBe(false);
      expect(isModelType(null)).toBe(false);
      expect(isModelType(undefined)).toBe(false);
      expect(isModelType(123)).toBe(false);
      expect(isModelType({})).toBe(false);
    });
  });

  describe('buildSchemaFullName', () => {
    it('should build correct full name from components', () => {
      expect(buildSchemaFullName('dsnp', 'broadcast', 'v2')).toBe('dsnp.broadcast@v2');
      expect(buildSchemaFullName('atproto', 'post', 'v1')).toBe('atproto.post@v1');
      expect(buildSchemaFullName('custom', 'message', 'v3')).toBe('custom.message@v3');
    });
  });

  describe('parseSchemaFullName', () => {
    it('should parse valid full names correctly', () => {
      const result1 = parseSchemaFullName('dsnp.broadcast@v2');
      expect(result1).toEqual({
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
      });

      const result2 = parseSchemaFullName('atproto.post@v1');
      expect(result2).toEqual({
        namespace: 'atproto',
        descriptor: 'post',
        version: 'v1',
      });
    });

    it('should handle complex descriptors with hyphens', () => {
      const result = parseSchemaFullName('dsnp.dsnp-content-attribute-set@v1');
      expect(result).toEqual({
        namespace: 'dsnp',
        descriptor: 'dsnp-content-attribute-set',
        version: 'v1',
      });
    });

    it('should return null for invalid formats', () => {
      expect(parseSchemaFullName('invalid')).toBeNull();
      expect(parseSchemaFullName('no-at-sign.descriptor')).toBeNull();
      expect(parseSchemaFullName('no-dot@v1')).toBeNull();
      expect(parseSchemaFullName('')).toBeNull();
      expect(parseSchemaFullName('namespace.descriptor')).toBeNull();
      expect(parseSchemaFullName('namespace@v1')).toBeNull();
    });
  });

  describe('isSchemaBatchable', () => {
    it('should return true for IPFS + Parquet', () => {
      expect(isSchemaBatchable(PayloadLocation.IPFS, ModelType.Parquet)).toBe(true);
    });

    it('should return true for IPFS + AvroBinary', () => {
      expect(isSchemaBatchable(PayloadLocation.IPFS, ModelType.AvroBinary)).toBe(true);
    });

    it('should return false for OnChain + Parquet', () => {
      expect(isSchemaBatchable(PayloadLocation.OnChain, ModelType.Parquet)).toBe(false);
    });

    it('should return false for Itemized + Parquet', () => {
      expect(isSchemaBatchable(PayloadLocation.Itemized, ModelType.Parquet)).toBe(false);
    });

    it('should return false for Paginated + AvroBinary', () => {
      expect(isSchemaBatchable(PayloadLocation.Paginated, ModelType.AvroBinary)).toBe(false);
    });
  });

  describe('createSchemaDefinition', () => {
    it('should create a valid SchemaDefinition for batchable schema', () => {
      const before = Date.now();
      const schema = createSchemaDefinition({
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });
      const after = Date.now();

      expect(schema.schemaId).toBe(17);
      expect(schema.namespace).toBe('dsnp');
      expect(schema.descriptor).toBe('broadcast');
      expect(schema.version).toBe('v2');
      expect(schema.fullName).toBe('dsnp.broadcast@v2');
      expect(schema.payloadLocation).toBe(PayloadLocation.IPFS);
      expect(schema.model).toBe(ModelType.Parquet);
      expect(schema.batchable).toBe(true);
      expect(schema.fetchedAt).toBeGreaterThanOrEqual(before);
      expect(schema.fetchedAt).toBeLessThanOrEqual(after);
    });

    it('should create a valid SchemaDefinition for non-batchable schema', () => {
      const schema = createSchemaDefinition({
        schemaId: 100,
        namespace: 'custom',
        descriptor: 'onchain-data',
        version: 'v1',
        payloadLocation: PayloadLocation.OnChain,
        model: ModelType.Parquet,
      });

      expect(schema.schemaId).toBe(100);
      expect(schema.fullName).toBe('custom.onchain-data@v1');
      expect(schema.batchable).toBe(false);
    });
  });

  describe('isSchemaDefinition', () => {
    const validSchema: SchemaDefinition = {
      schemaId: 17,
      namespace: 'dsnp',
      descriptor: 'broadcast',
      version: 'v2',
      fullName: 'dsnp.broadcast@v2',
      payloadLocation: PayloadLocation.IPFS,
      model: ModelType.Parquet,
      batchable: true,
      fetchedAt: Date.now(),
    };

    it('should return true for valid SchemaDefinition', () => {
      expect(isSchemaDefinition(validSchema)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isSchemaDefinition(null)).toBe(false);
      expect(isSchemaDefinition(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(isSchemaDefinition('string')).toBe(false);
      expect(isSchemaDefinition(123)).toBe(false);
      expect(isSchemaDefinition(true)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      const { schemaId, ...withoutSchemaId } = validSchema;
      expect(isSchemaDefinition(withoutSchemaId)).toBe(false);

      const { namespace, ...withoutNamespace } = validSchema;
      expect(isSchemaDefinition(withoutNamespace)).toBe(false);

      const { descriptor, ...withoutDescriptor } = validSchema;
      expect(isSchemaDefinition(withoutDescriptor)).toBe(false);
    });

    it('should return false for invalid schemaId', () => {
      expect(isSchemaDefinition({ ...validSchema, schemaId: 0 })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, schemaId: -1 })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, schemaId: 65537 })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, schemaId: 'invalid' })).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isSchemaDefinition({ ...validSchema, namespace: '' })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, descriptor: '' })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, version: '' })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, fullName: '' })).toBe(false);
    });

    it('should return false for invalid payloadLocation', () => {
      expect(isSchemaDefinition({ ...validSchema, payloadLocation: 'Invalid' })).toBe(false);
    });

    it('should return false for invalid model', () => {
      expect(isSchemaDefinition({ ...validSchema, model: 'Invalid' })).toBe(false);
    });

    it('should return false for invalid batchable', () => {
      expect(isSchemaDefinition({ ...validSchema, batchable: 'true' })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, batchable: 1 })).toBe(false);
    });

    it('should return false for invalid fetchedAt', () => {
      expect(isSchemaDefinition({ ...validSchema, fetchedAt: 0 })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, fetchedAt: -1 })).toBe(false);
      expect(isSchemaDefinition({ ...validSchema, fetchedAt: 'invalid' })).toBe(false);
    });
  });

  describe('createSchemaCacheEntry', () => {
    it('should create a valid cache entry with correct expiry', () => {
      const schema = createSchemaDefinition({
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });

      const ttlSeconds = 3600;
      const before = Date.now() + ttlSeconds * 1000;
      const entry = createSchemaCacheEntry(schema, ttlSeconds);
      const after = Date.now() + ttlSeconds * 1000;

      expect(entry.schema).toBe(schema);
      expect(entry.expiresAt).toBeGreaterThanOrEqual(before);
      expect(entry.expiresAt).toBeLessThanOrEqual(after);
    });
  });

  describe('createSchemaNameCacheEntry', () => {
    it('should create a valid name cache entry with correct expiry', () => {
      const fullName = 'dsnp.broadcast@v2';
      const schemaId = 17;
      const ttlSeconds = 3600;

      const before = Date.now() + ttlSeconds * 1000;
      const entry = createSchemaNameCacheEntry(fullName, schemaId, ttlSeconds);
      const after = Date.now() + ttlSeconds * 1000;

      expect(entry.fullName).toBe(fullName);
      expect(entry.schemaId).toBe(schemaId);
      expect(entry.expiresAt).toBeGreaterThanOrEqual(before);
      expect(entry.expiresAt).toBeLessThanOrEqual(after);
    });
  });

  describe('isCacheEntryExpired', () => {
    it('should return false for non-expired schema cache entry', () => {
      const schema = createSchemaDefinition({
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });

      const entry = createSchemaCacheEntry(schema, 3600);
      expect(isCacheEntryExpired(entry)).toBe(false);
    });

    it('should return true for expired schema cache entry', () => {
      const schema = createSchemaDefinition({
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });

      const entry: SchemaCacheEntry = {
        schema,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      expect(isCacheEntryExpired(entry)).toBe(true);
    });

    it('should return false for non-expired name cache entry', () => {
      const entry = createSchemaNameCacheEntry('dsnp.broadcast@v2', 17, 3600);
      expect(isCacheEntryExpired(entry)).toBe(false);
    });

    it('should return true for expired name cache entry', () => {
      const entry: SchemaNameCacheEntry = {
        fullName: 'dsnp.broadcast@v2',
        schemaId: 17,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      expect(isCacheEntryExpired(entry)).toBe(true);
    });

    it('should handle edge case of exactly at expiry time', () => {
      const now = Date.now();
      const entry: SchemaNameCacheEntry = {
        fullName: 'dsnp.broadcast@v2',
        schemaId: 17,
        expiresAt: now,
      };

      // At exactly the expiry time, it should be considered expired
      expect(isCacheEntryExpired(entry)).toBe(true);
    });
  });

  describe('SchemaDefinition interface', () => {
    it('should allow creating objects with all required properties', () => {
      const schema: SchemaDefinition = {
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        fullName: 'dsnp.broadcast@v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
        batchable: true,
        fetchedAt: Date.now(),
      };

      expect(schema).toBeDefined();
      expect(schema.schemaId).toBe(17);
    });
  });

  describe('Integration: Full workflow', () => {
    it('should support complete schema lifecycle', () => {
      // 1. Create a schema definition
      const schema = createSchemaDefinition({
        schemaId: 17,
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });

      // 2. Validate it's a proper schema definition
      expect(isSchemaDefinition(schema)).toBe(true);

      // 3. Verify batchability
      expect(schema.batchable).toBe(true);

      // 4. Create cache entries
      const schemaCacheEntry = createSchemaCacheEntry(schema, 3600);
      const nameCacheEntry = createSchemaNameCacheEntry(schema.fullName, schema.schemaId, 3600);

      // 5. Verify cache entries are not expired
      expect(isCacheEntryExpired(schemaCacheEntry)).toBe(false);
      expect(isCacheEntryExpired(nameCacheEntry)).toBe(false);

      // 6. Parse the full name
      const parsed = parseSchemaFullName(schema.fullName);
      expect(parsed).toEqual({
        namespace: 'dsnp',
        descriptor: 'broadcast',
        version: 'v2',
      });

      // 7. Rebuild full name from parsed components
      if (parsed) {
        const rebuilt = buildSchemaFullName(parsed.namespace, parsed.descriptor, parsed.version);
        expect(rebuilt).toBe(schema.fullName);
      }
    });

    it('should handle AT Protocol schema example', () => {
      const schema = createSchemaDefinition({
        schemaId: 100,
        namespace: 'atproto',
        descriptor: 'post',
        version: 'v1',
        payloadLocation: PayloadLocation.IPFS,
        model: ModelType.Parquet,
      });

      expect(schema.fullName).toBe('atproto.post@v1');
      expect(schema.batchable).toBe(true);
      expect(isSchemaDefinition(schema)).toBe(true);
    });

    it('should handle non-batchable on-chain schema', () => {
      const schema = createSchemaDefinition({
        schemaId: 200,
        namespace: 'custom',
        descriptor: 'direct-message',
        version: 'v1',
        payloadLocation: PayloadLocation.OnChain,
        model: ModelType.Parquet,
      });

      expect(schema.fullName).toBe('custom.direct-message@v1');
      expect(schema.batchable).toBe(false);
      expect(isSchemaDefinition(schema)).toBe(true);
    });
  });
});

