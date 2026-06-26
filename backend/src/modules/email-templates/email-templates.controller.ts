import { Controller, Post, Body, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';

@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private svc: EmailTemplatesService) {}

  @Post()
  create(@Body() body: any) {
    return this.svc.createTemplate(body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getTemplate(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTemplate(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteTemplate(id);
  }

  @Post(':id/versions')
  createVersion(@Param('id') id: string, @Body() body: any) {
    return this.svc.createVersion(id, body);
  }

  @Get('versions/:vid')
  getVersion(@Param('vid') vid: string) {
    return this.svc.getVersion(vid);
  }

  @Post('versions/:vid/preview')
  previewVersion(@Param('vid') vid: string, @Body() body: any) {
    return this.svc.previewVersion(vid, body.variables ?? {});
  }

  @Post('ab-tests')
  createAbTest(@Body() body: any) {
    return this.svc.createAbTest(body);
  }

  @Post('ab-tests/:id/preview')
  previewAb(@Param('id') id: string, @Body() body: any, @Query('seed') seed?: string) {
    const s = seed ? Number(seed) : undefined;
    return this.svc.previewAbTest(id, body.variables ?? {}, s);
  }
}
