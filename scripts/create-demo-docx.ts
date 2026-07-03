import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const fixturesDir = path.join(process.cwd(), 'scripts', 'fixtures');
const outPath = path.join(fixturesDir, 'demo-homework.docx');
const tempDir = path.join(fixturesDir, '.docx-tmp');

fs.mkdirSync(path.join(tempDir, '_rels'), { recursive: true });
fs.mkdirSync(path.join(tempDir, 'word', '_rels'), { recursive: true });

fs.writeFileSync(
  path.join(tempDir, '[Content_Types].xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
);

fs.writeFileSync(
  path.join(tempDir, '_rels', '.rels'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
);

fs.writeFileSync(
  path.join(tempDir, 'word', 'document.xml'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p><w:r><w:t>Bai tap demo - doc file test</w:t></w:r></w:p></w:body>
</w:document>`
);

fs.writeFileSync(
  path.join(tempDir, 'word', '_rels', 'document.xml.rels'),
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
);

if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
execSync(`tar -a -c -f "${outPath}" -C "${tempDir}" .`, { stdio: 'inherit' });
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Created', outPath);
