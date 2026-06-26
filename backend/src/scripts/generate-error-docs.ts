import { ErrorCodeRegistry } from '../common/services/error-code-registry.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to generate error code documentation
 * Usage: ts-node src/scripts/generate-error-docs.ts
 */
async function generateDocs() {
  const registry = new ErrorCodeRegistry();

  // Generate Markdown documentation
  const markdown = registry.exportToMarkdown();
  const markdownPath = path.join(
    __dirname,
    '../../../docs/ERROR_CODES.md',
  );
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, markdown);
  console.log(`✅ Generated Markdown documentation: ${markdownPath}`);

  // Generate JSON documentation
  const json = registry.exportToJson();
  const jsonPath = path.join(__dirname, '../../../docs/error-codes.json');
  fs.writeFileSync(jsonPath, json);
  console.log(`✅ Generated JSON documentation: ${jsonPath}`);

  console.log('\n📄 Error documentation generated successfully!');
}

generateDocs().catch((error) => {
  console.error('❌ Failed to generate error documentation:', error);
  process.exit(1);
});
