import { PartialType } from '@nestjs/swagger';
import { CreateSavedSearchDto } from './create-saved-search.dto';

export class UpdateSavedSearchDto extends PartialType(CreateSavedSearchDto) {}
