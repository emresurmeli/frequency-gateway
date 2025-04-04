/* eslint-disable class-methods-use-this */
import { ApiService } from '#content-watcher/api.service';
import { ContentSearchRequestDto, SearchResponseDto } from '#types/dtos/content-watcher';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller({ version: '1', path: 'search' })
@ApiTags('v1/search')
export class SearchControllerV1 {
  // eslint-disable-next-line no-empty-function
  constructor(private readonly apiService: ApiService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Search for DSNP content by id and filters, starting from `upperBound` block and going back for `blockCount` number of blocks',
  })
  @ApiOkResponse({
    description: 'Returns a jobId to be used to retrieve the results',
    type: SearchResponseDto,
  })
  async search(@Body() searchRequest: ContentSearchRequestDto): Promise<SearchResponseDto> {
    const jobResult = await this.apiService.searchContent(searchRequest);

    return {
      status: HttpStatus.OK,
      jobId: jobResult.id,
    };
  }
}
