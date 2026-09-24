import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryNotificationsDto extends PaginationDto {
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;
}
