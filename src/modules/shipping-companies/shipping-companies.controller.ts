import { Controller, Get, Param, Query } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiSecurity,
    ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Paginated } from '../../common/utils/pagination';
import { QueryShippingCompaniesDto } from './dto/query-shipping-companies.dto';
import {
    ShippingCompaniesService,
} from './shipping-companies.service';
import { ShippingCompanyResponse } from './shipping-companies.mapper';

@ApiTags('shipping-companies')
@Controller('shipping-companies')
export class ShippingCompaniesController {
    constructor(private readonly companies: ShippingCompaniesService) { }

    @Public()
    @Get()
    @ApiSecurity({})
    @ApiOperation({
        summary: 'List shipping companies',
        description:
            'Public directory. Filters: q (name/location), location, verified.',
    })
    @ApiOkResponse({ description: 'Paginated list of shipping companies' })
    list(
        @Query() query: QueryShippingCompaniesDto,
    ): Promise<Paginated<ShippingCompanyResponse>> {
        return this.companies.list(query);
    }


    @Public()
    @Get(':id')
    @ApiSecurity({})
    @ApiOperation({ summary: 'Shipping company detail' })
    @ApiOkResponse({ description: 'Single shipping company' })
    detail(
        @Param('id') id: string,
    ): Promise<{ company: ShippingCompanyResponse }> {
        return this.companies.detail(id);
    }
}