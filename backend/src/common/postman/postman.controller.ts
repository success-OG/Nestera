import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { PostmanCollectionGenerator } from './postman-collection.generator';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

@Controller('api/postman')
@ApiTags('Postman')
export class PostmanController {
  constructor(private app: INestApplication) {}

  @Get('collection/v2')
  @ApiOperation({
    summary: 'Export Postman Collection for API v2',
    description: 'Download Postman collection JSON for API v2',
  })
  async exportCollectionV2(@Res() res: Response) {
    const config = new DocumentBuilder()
      .setTitle('Nestera API v2')
      .setVersion('2.0.0')
      .build();

    const openapi = SwaggerModule.createDocument(this.app, config);

    const collection = PostmanCollectionGenerator.generate(
      openapi,
      'http://localhost:3001',
      '2.0.0',
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Nestera-API-v2.postman_collection.json"',
    );
    res.send(collection);
  }
}
