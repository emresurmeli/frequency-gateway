import { IsArray, IsInt, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsSchemaId } from '#utils/decorators/is-schema-id.decorator';

export class BatchFilesUploadDto {
  @ApiProperty({
    description: 'Array of schema IDs for the batch files',
    type: [Number],
    example: [16001, 16002],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsSchemaId({ each: true })
  schemaIds: number[];
} 