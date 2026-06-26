import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplate, EmailTemplateVersion, EmailAbTest, EmailAbVariant } from './email-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate, EmailTemplateVersion, EmailAbTest, EmailAbVariant])],
  controllers: [EmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
