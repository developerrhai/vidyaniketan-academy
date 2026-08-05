import * as fs from 'fs';
import * as path from 'path';

const imagePath = 'C:\\Users\\admin\\Desktop\\vidyaniketan-academy\\watermark logo A (1).png';
const imagesTsPath = 'C:\\Users\\admin\\Desktop\\vidyaniketan-academy\\vidyaniketan-academy\\components\\dashboard\\receipt-images.ts';

try {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  let imagesContent = fs.readFileSync(imagesTsPath, 'utf8');

  const watermarkRegex = /export const WATERMARK_BASE64 = "[^"]*"/;
  if (watermarkRegex.test(imagesContent)) {
    imagesContent = imagesContent.replace(watermarkRegex, `export const WATERMARK_BASE64 = "${base64Image}"`);
    fs.writeFileSync(imagesTsPath, imagesContent, 'utf8');
    console.log('Successfully updated WATERMARK_BASE64 in receipt-images.ts');
  } else {
    console.error('Could not find WATERMARK_BASE64 export in receipt-images.ts');
  }
} catch (error) {
  console.error('Error running script:', error);
}
