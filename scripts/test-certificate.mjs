// Quick test script for certificate PDF generation
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// We need to test the @react-pdf font loading
async function testFonts() {
  const fontsDir = join(process.cwd(), 'public', 'fonts');
  const fonts = ['Roboto-Regular.ttf', 'Roboto-Bold.ttf', 'Amiri-Regular.ttf', 'Amiri-Bold.ttf'];
  
  for (const font of fonts) {
    const fp = join(fontsDir, font);
    try {
      const buf = readFileSync(fp);
      console.log(`✅ ${font}: ${buf.length} bytes, magic: ${buf.slice(0, 4).toString('hex')}`);
    } catch (e) {
      console.log(`❌ ${font}: ${e.message}`);
    }
  }
}

async function testRender() {
  // Dynamic import to trigger Font.register in certificate-template
  try {
    // Need to transpile TSX, use tsx or ts-node
    console.log('\nTesting @react-pdf/renderer import...');
    const { renderToBuffer } = await import('@react-pdf/renderer');
    console.log('✅ @react-pdf/renderer imported');
    
    // Try registering fonts manually
    const { Font } = await import('@react-pdf/renderer');
    const fontsDir = join(process.cwd(), 'public', 'fonts');
    
    Font.register({
      family: 'Roboto',
      fonts: [
        { src: join(fontsDir, 'Roboto-Regular.ttf'), fontWeight: 400 },
        { src: join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 700 },
      ],
    });
    console.log('✅ Roboto fonts registered');
    
    Font.register({
      family: 'Amiri',
      fonts: [
        { src: join(fontsDir, 'Amiri-Regular.ttf'), fontWeight: 400 },
        { src: join(fontsDir, 'Amiri-Bold.ttf'), fontWeight: 700 },
      ],
    });
    console.log('✅ Amiri fonts registered');

    // Try a minimal render
    const React = (await import('react')).default;
    const { Document, Page, Text, View } = await import('@react-pdf/renderer');
    
    const doc = React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: { fontFamily: 'Roboto' } },
        React.createElement(View, null,
          React.createElement(Text, null, 'Test English'),
          React.createElement(Text, { style: { fontFamily: 'Amiri' } }, 'اختبار عربي')
        )
      )
    );
    
    console.log('\nRendering test PDF...');
    const buffer = await renderToBuffer(doc);
    writeFileSync('/tmp/test-certificate.pdf', buffer);
    console.log(`✅ PDF rendered: ${buffer.length} bytes → /tmp/test-certificate.pdf`);
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  }
}

await testFonts();
await testRender();
