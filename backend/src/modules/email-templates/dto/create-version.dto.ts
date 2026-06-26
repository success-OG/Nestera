export class CreateVersionDto {
  version?: number;
  subject: string;
  html?: string;
  text?: string;
  metadata?: any;
  active?: boolean;
}
