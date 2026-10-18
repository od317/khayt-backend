import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'false' })
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;
}
