import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { SearchProductsDto } from './dto/search.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  search(@Query() query: SearchProductsDto) {
    return this.searchService.search(query);
  }

  @Public()
  @Get('suggest')
  suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.searchService.suggest(q, limit ? Number(limit) : 8);
  }
}
