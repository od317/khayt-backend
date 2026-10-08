import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Paginated } from '../../common/utils/pagination';
import { CreateShippingCompanyDto } from './dto/create-shipping-company.dto';
import { QueryShippingCompaniesDto } from './dto/query-shipping-companies.dto';
import { UpdateShippingCompanyDto } from './dto/update-shipping-company.dto';
import {
    ShippingCompaniesService,
} from './shipping-companies.service';
import { ShippingCompanyResponse } from './shipping-companies.mapper';

@ApiTags('admin-shipping-companies')
@ApiBearerAuth('access-token')
@Controller('admin/shipping-companies')
@Roles(UserRole.admin, UserRole.super_admin)
export class AdminShippingCompaniesController {
    constructor(private readonly companies: ShippingCompaniesService) { }

    @Get()
    @ApiOperation({ summary: 'List all shipping companies (admin)' })
    @ApiOkResponse({ description: 'Paginated list of shipping companies' })
    list(
        @Query() query: QueryShippingCompaniesDto,
    ): Promise<Paginated<ShippingCompanyResponse>> {
        return this.companies.list(query);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a shipping company' })
    create(
        @Body() dto: CreateShippingCompanyDto,
    ): Promise<{ company: ShippingCompanyResponse }> {
        return this.companies.adminCreate(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a shipping company' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateShippingCompanyDto,
    ): Promise<{ company: ShippingCompanyResponse }> {
        return this.companies.adminUpdate(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a shipping company' })
    remove(@Param('id') id: string): Promise<{ success: true }> {
        return this.companies.adminRemove(id);
    }
}