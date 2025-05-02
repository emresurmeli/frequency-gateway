import {
  Body,
  Controller,
  HttpCode,
  Put,
  UnprocessableEntityException,
  Inject,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ApiService } from '../../api.service';
import { AnnouncementResponseDto } from '#types/dtos/content-publishing';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import apiConfig, { IContentPublishingApiConfig } from '#content-publishing-api/api.config';
import { BatchFilesUploadDto } from '#types/dtos/content-publishing/v3/batch-announcement.dto';
import { DSNP_VALID_MIME_TYPES } from '#types/dtos/content-publishing/validation';
import { ParquetValidatorService } from '../../services/parquet-validator.service';

@Controller({ version: '3', path: 'content' })
@ApiTags('v3/content')
export class ContentControllerV3 {
  constructor(
    @Inject(apiConfig.KEY) private readonly appConfig: IContentPublishingApiConfig,
    private readonly apiService: ApiService,
    private readonly blockchainService: BlockchainRpcQueryService,
    private readonly parquetValidator: ParquetValidatorService,
  ) {}

  @Put('batchAnnouncement')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create off-chain batch content announcements with direct Parquet file uploads' })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({ status: '2XX', type: AnnouncementResponseDto })
  @ApiBody({
    description: 'Batch announcement request with Parquet files',
    type: BatchFilesUploadDto,
  })
  async putBatches(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: DSNP_VALID_MIME_TYPES,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: Express.Multer.File[],
    @Body() batchContentDto: BatchFilesUploadDto,
  ): Promise<AnnouncementResponseDto[]> {
    // Validate that the number of files matches the number of schema IDs
    if (files.length !== batchContentDto.schemaIds.length) {
      throw new UnprocessableEntityException('Number of files must match number of schema IDs');
    }

    // Process each file and create batch announcements
    const promises = files.map(async (file, index) => {
      const schemaId = batchContentDto.schemaIds[index];

      // Validate Parquet file against schema
      const isValid = await this.parquetValidator.validateParquetFile(file.buffer, schemaId);
      if (!isValid) {
        throw new UnprocessableEntityException(`Parquet file validation failed for schema ID ${schemaId}`);
      }

      return this.apiService.enqueueBatchRequestWithFile(file, schemaId);
    });

    return Promise.all(promises);
  }
} 