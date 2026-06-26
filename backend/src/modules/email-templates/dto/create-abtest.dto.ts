export class CreateAbTestDto {
  name: string;
  templateId: string;
  variants: { versionId: string; weight?: number; key?: string }[];
}
