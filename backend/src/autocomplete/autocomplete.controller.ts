import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AutocompleteService } from './autocomplete.service';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';

@ApiTags('autocomplete')
@Controller('autocomplete')
export class AutocompleteController {
  constructor(private readonly autocompleteService: AutocompleteService) {}

  @Get('shops')
  @ApiOperation({
    summary: 'Get shop name suggestions',
    description: 'Returns a list of previously used shop names, sorted by frequency. Optionally filter by search prefix.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of shop suggestions with usage count',
    schema: {
      example: {
        suggestions: [
          { value: 'Maxi', count: 5 },
          { value: 'IKEA', count: 2 }
        ]
      }
    }
  })
  async getShops(@Query() query: AutocompleteQueryDto) {
    const suggestions = await this.autocompleteService.getShops(query.search);
    return { suggestions };
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get product description suggestions',
    description: 'Returns a list of previously used product descriptions, sorted by frequency. Optionally filter by search prefix.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of product suggestions with usage count'
  })
  async getProducts(@Query() query: AutocompleteQueryDto) {
    const suggestions = await this.autocompleteService.getProducts(query.search);
    return { suggestions };
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get category suggestions',
    description: 'Returns a list of previously used categories, sorted by frequency. Optionally filter by search prefix.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of category suggestions with usage count'
  })
  async getCategories(@Query() query: AutocompleteQueryDto) {
    const suggestions = await this.autocompleteService.getCategories(query.search);
    return { suggestions };
  }

  @Get('tags')
  @ApiOperation({
    summary: 'Get tag suggestions',
    description: 'Returns a list of previously used tags, sorted by frequency. Optionally filter by search prefix.'
  })
  @ApiResponse({
    status: 200,
    description: 'List of tag suggestions with usage count'
  })
  async getTags(@Query() query: AutocompleteQueryDto) {
    const suggestions = await this.autocompleteService.getTags(query.search);
    return { suggestions };
  }
}
