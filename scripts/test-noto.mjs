import { writeFileSync } from 'fs';
import { join } from 'path';

const fontsDir = join(process.cwd(), 'public', 'fonts');

async function test() {
  const { renderToBuffer, Font } = await import('@react-pdf/renderer');
  const React = (await import('react')).default;
  const { Document, Page, Text, View } = await import('@react-pdf/renderer');

  // Register Noto Naskh Arabic instead of Amiri
  Font.register({
    family: 'NotoNaskh',
    src: join(fontsDir, 'NotoNaskhArabic-Regular.ttf'),
  });

  Font.register({
    family: 'Roboto',
    fonts: [
      { src: join(fontsDir, 'Roboto-Regular.ttf'), fontWeight: 400 },
      { src: join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 700 },
    ],
  });

  // Use real Arabic text that would appear in a certificate
  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: { fontFamily: 'Roboto', padding: 40 } },
      React.createElement(View, null,
        React.createElement(Text, { style: { fontSize: 24, marginBottom: 20 } }, 'CBAHI Clinical Privileges Certificate'),
        React.createElement(Text, { style: { fontFamily: 'NotoNaskh', fontSize: 20, textAlign: 'right', marginBottom: 10 } }, 'شهادة الامتيازات السريرية'),
        React.createElement(Text, { style: { fontFamily: 'NotoNaskh', fontSize: 14, textAlign: 'right', marginBottom: 5 } }, 'الاسم: محمد غسان'),
        React.createElement(Text, { style: { fontFamily: 'NotoNaskh', fontSize: 14, textAlign: 'right', marginBottom: 5 } }, 'القسم: طب الأسنان العام'),
        React.createElement(Text, { style: { fontFamily: 'NotoNaskh', fontSize: 14, textAlign: 'right', marginBottom: 5 } }, 'المسمى الوظيفي: أخصائي'),
        React.createElement(Text, { style: { fontFamily: 'NotoNaskh', fontSize: 14, textAlign: 'right' } }, 'رئيس القسم | رئيس الادارة | المدير الطبي'),
      )
    )
  );

  console.log('Rendering PDF with Noto Naskh Arabic...');
  const buffer = await renderToBuffer(doc);
  const out = '/tmp/test-noto-cert.pdf';
  writeFileSync(out, buffer);
  console.log(`✅ PDF rendered: ${buffer.length} bytes → ${out}`);
}

test().catch(e => { console.error('❌', e.message); process.exit(1); });
