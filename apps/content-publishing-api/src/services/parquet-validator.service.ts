import { Injectable, Logger } from '@nestjs/common';
import { ParquetReader } from '@dsnp/parquetjs';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { hexToString } from '@polkadot/util';
import { fromDSNPSchema } from '@dsnp/schemas/parquet';

@Injectable()
export class ParquetValidatorService {
  private readonly logger: Logger;

  constructor(private readonly blockchainService: BlockchainRpcQueryService) {
    this.logger = new Logger(ParquetValidatorService.name);
  }

  async validateParquetFile(file: Buffer, schemaId: number): Promise<boolean> {
    try {
      // Get the schema from the blockchain
      const schemaResponse = await this.blockchainService.getSchemaPayload(schemaId);
      if (!schemaResponse) {
        throw new Error(`Unable to retrieve schema for Schema ID ${schemaId}`);
      }

      // Parse the schema
      const hexString: string = Buffer.from(schemaResponse).toString('utf8');
      const schema = JSON.parse(hexToString(hexString));
      if (!schema) {
        throw new Error(`Unable to parse schema for schemaId ${schemaId}`);
      }

      // Convert DSNP schema to Parquet schema
      const [parquetSchema] = fromDSNPSchema(schema);

      // Read and validate the Parquet file
      const reader = await ParquetReader.openBuffer(file);
      const cursor = reader.getCursor();

      // Validate each row against the schema
      let record = await cursor.next();
      while (record) {
        // Check if all required fields are present and have correct types
        for (const field of parquetSchema.fields) {
          if (!(field.name in record)) {
            throw new Error(`Missing required field: ${field.name}`);
          }
          // TODO: Add more detailed type validation based on the schema
        }
        record = await cursor.next();
      }

      return true;
    } catch (error) {
      this.logger.error(`Parquet validation failed: ${error.message}`);
      return false;
    }
  }
} 