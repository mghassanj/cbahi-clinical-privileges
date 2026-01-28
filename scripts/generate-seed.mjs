import fs from 'fs';

const data = fs.readFileSync('src/data/privileges.ts', 'utf8');

// Find the array and extract objects
const arrayMatch = data.match(/export const dentalPrivileges[^=]*=\s*\[([\s\S]*)\];/);
if (!arrayMatch) {
  console.error('Could not find dentalPrivileges array');
  process.exit(1);
}

// Parse each object - extract fields one by one
const content = arrayMatch[1];
const objects = [];
let current = {};
let depth = 0;
let inObject = false;

for (const line of content.split('\n')) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('{')) {
    inObject = true;
    current = {};
    depth++;
  } else if (trimmed.startsWith('}')) {
    depth--;
    if (depth === 0 && inObject) {
      if (current.id) objects.push(current);
      inObject = false;
    }
  } else if (inObject) {
    const idMatch = trimmed.match(/id:\s*'([^']+)'/);
    const codeMatch = trimmed.match(/code:\s*'([^']+)'/);
    const nameEnMatch = trimmed.match(/nameEn:\s*'([^']+)'/);
    const nameArMatch = trimmed.match(/nameAr:\s*'([^']+)'/);
    const categoryMatch = trimmed.match(/category:\s*PrivilegeCategory\.(\w+)/);
    const reqMatch = trimmed.match(/requiresSpecialQualification:\s*(true|false)/);
    
    if (idMatch) current.id = idMatch[1];
    if (codeMatch) current.code = codeMatch[1];
    if (nameEnMatch) current.nameEn = nameEnMatch[1];
    if (nameArMatch) current.nameAr = nameArMatch[1];
    if (categoryMatch) current.category = categoryMatch[1];
    if (reqMatch) current.reqSpecial = reqMatch[1] === 'true';
  }
}

console.log(`Found ${objects.length} privileges`);

// Map frontend category names to DB enum values
const categoryMap = {
  'CORE': 'CORE',
  'RESTORATIVE': 'RESTORATIVE',
  'PEDIATRIC': 'PEDIATRIC',
  'ORTHODONTICS': 'ORTHODONTIC',
  'ENDODONTICS': 'ENDODONTIC',
  'PERIODONTICS': 'PERIODONTIC',
  'PROSTHODONTICS': 'PROSTHODONTIC',
  'ORAL_SURGERY': 'ORAL_SURGERY',
  'ORAL_MEDICINE': 'ORAL_MEDICINE',
  'RADIOLOGY': 'DIAGNOSTIC',
  'PREVENTIVE': 'PREVENTIVE',
  'IMPLANT': 'IMPLANT',
  'COSMETIC': 'COSMETIC',
  'OTHER': 'OTHER',
};

// Generate SQL
const escape = (s) => s.replace(/'/g, "''");

const values = objects.map(p => {
  const dbCategory = categoryMap[p.category] || p.category;
  return `('${p.id}', '${p.code}', '${escape(p.nameEn)}', '${escape(p.nameAr)}', '${dbCategory}', ${p.reqSpecial}, true, NOW(), NOW())`;
}).join(',\n');

const sql = `-- Auto-generated full privileges seed
-- Total: ${objects.length} privileges

INSERT INTO privileges (id, code, "nameEn", "nameAr", category, "requiresSpecialQualification", "isActive", "createdAt", "updatedAt") VALUES
${values}
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  "nameEn" = EXCLUDED."nameEn",
  "nameAr" = EXCLUDED."nameAr",
  category = EXCLUDED.category,
  "requiresSpecialQualification" = EXCLUDED."requiresSpecialQualification",
  "updatedAt" = NOW();
`;

fs.writeFileSync('scripts/full-seed.sql', sql);
console.log('Written to scripts/full-seed.sql');
