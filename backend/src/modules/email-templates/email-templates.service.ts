import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmailTemplate,
  EmailTemplateVersion,
  EmailAbTest,
  EmailAbVariant,
} from './email-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { CreateAbTestDto } from './dto/create-abtest.dto';
import { substituteVariables } from './utils/substitute';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templatesRepo: Repository<EmailTemplate>,
    @InjectRepository(EmailTemplateVersion)
    private versionsRepo: Repository<EmailTemplateVersion>,
    @InjectRepository(EmailAbTest)
    private abTestRepo: Repository<EmailAbTest>,
    @InjectRepository(EmailAbVariant)
    private variantRepo: Repository<EmailAbVariant>,
  ) {}

  async createTemplate(dto: CreateTemplateDto) {
    const template = this.templatesRepo.create(dto as any);
    return this.templatesRepo.save(template);
  }

  async getTemplate(id: string) {
    const t = await this.templatesRepo.findOne({
      where: { id },
      relations: ['versions'],
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async updateTemplate(id: string, patch: Partial<CreateTemplateDto>) {
    await this.templatesRepo.update(id, patch);
    return this.getTemplate(id);
  }

  async deleteTemplate(id: string) {
    return this.templatesRepo.delete(id);
  }

  async createVersion(templateId: string, dto: CreateVersionDto) {
    const template = await this.templatesRepo.findOneBy({ id: templateId });
    if (!template) throw new NotFoundException('Template not found');

    const last = await this.versionsRepo.find({
      where: { template: { id: templateId } },
      order: { version: 'DESC' },
      take: 1,
    });
    const nextVersion = (last[0]?.version ?? 0) + 1;

    const v = this.versionsRepo.create({
      template,
      version: dto.version ?? nextVersion,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      metadata: dto.metadata ?? {},
      active: !!dto.active,
    } as any);

    return this.versionsRepo.save(v);
  }

  async getVersion(id: string) {
    const v = await this.versionsRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Version not found');
    return v;
  }

  async previewVersion(versionId: string, variables: any) {
    const v = await this.getVersion(versionId);
    return {
      subject: substituteVariables(v.subject, variables),
      html: v.html ? substituteVariables(v.html, variables) : null,
      text: v.text ? substituteVariables(v.text, variables) : null,
    };
  }

  async createAbTest(dto: CreateAbTestDto) {
    const template = await this.templatesRepo.findOneBy({ id: dto.templateId });
    if (!template) throw new NotFoundException('Template not found');

    const ab = this.abTestRepo.create({
      name: dto.name,
      template,
    });
    ab.variants = [];
    for (const v of dto.variants) {
      const ver = await this.versionsRepo.findOneBy({ id: v.versionId });
      if (!ver) throw new NotFoundException('Version for variant not found');
      const variant = this.variantRepo.create({
        version: ver,
        weight: v.weight ?? 1,
        key: v.key,
      });
      ab.variants.push(variant);
    }

    return this.abTestRepo.save(ab);
  }

  async pickVariant(abTestId: string, seed?: number) {
    const ab = await this.abTestRepo.findOne({
      where: { id: abTestId },
      relations: ['variants', 'variants.version'],
    });
    if (!ab) throw new NotFoundException('AB test not found');
    const total = ab.variants.reduce((s, v) => s + (v.weight ?? 1), 0);
    const rnd =
      typeof seed === 'number'
        ? seed % total
        : Math.floor(Math.random() * total);
    let acc = 0;
    for (const v of ab.variants) {
      acc += v.weight ?? 1;
      if (rnd < acc) return v;
    }
    return ab.variants[0];
  }

  async previewAbTest(abTestId: string, variables: any, seed?: number) {
    const variant = await this.pickVariant(abTestId, seed);
    const v = variant.version;
    return {
      variantKey: variant.key ?? variant.id,
      subject: substituteVariables(v.subject, variables),
      html: v.html ? substituteVariables(v.html, variables) : null,
      text: v.text ? substituteVariables(v.text, variables) : null,
    };
  }
}
