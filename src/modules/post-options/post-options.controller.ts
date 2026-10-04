import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { QueryPostOptionsDto } from './dto/query-post-options.dto';
import {
  PostOptionsByTypeResponse,
  PostOptionsService,
} from './post-options.service';

@Controller('post-options')
export class PostOptionsController {
  constructor(private readonly options: PostOptionsService) {}

  @Public()
  @Get()
  list(
    @Query() query: QueryPostOptionsDto,
  ): Promise<PostOptionsByTypeResponse> {
    return this.options.listForType(query);
  }
}
