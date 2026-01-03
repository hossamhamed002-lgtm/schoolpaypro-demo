const arabicToEnglishDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const disambiguateArabicSixToTwo = (value: string) => {
  const chars = Array.from(value);
  const isArabicDigit = (c: string) => /[٠-٩]/.test(c);
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '٦') {
      const prev = chars[i - 1];
      const next = chars[i + 1];
      if ((prev && isArabicDigit(prev)) || (next && isArabicDigit(next))) {
        chars[i] = '٢';
      }
    }
  }
  return chars.join('');
};

const getVisionApiKey = () => {
  const key = (import.meta as any)?.env?.VITE_GOOGLE_VISION_API_KEY || (process as any)?.env?.VITE_GOOGLE_VISION_API_KEY;
  if (!key) {
    throw new Error('مفتاح Google Vision غير متوفر (VITE_GOOGLE_VISION_API_KEY).');
  }
  return key;
};

const preprocessImage = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  const minWidth = 1500;
  const scale = bitmap.width < minWidth ? minWidth / bitmap.width : 1;
  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('تعذر إنشاء سياق الرسم لمعالجة الصورة.');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;

  // Grayscale + moderate contrast boost
  const contrast = 30; // mild contrast
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const gray = Math.min(255, Math.max(0, factor * (avg - 128) + 128));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  bitmap.close();

  return canvas.toDataURL('image/png');
};

export const extractTextFromImage = async (file: File): Promise<string> => {
  const apiKey = getVisionApiKey();
  const dataUrl = await preprocessImage(file);
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: {
          languageHints: ['ar']
        }
      }
    ]
  };

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error('فشل طلب Google Vision OCR.');
  }

  const payload = await response.json();
  const full = payload?.responses?.[0];
  if (!full) {
    throw new Error('لم يتم إرجاع أي نص من خدمة OCR.');
  }

  const collectWords = () => {
    const words: { text: string; x: number; y: number }[] = [];
    const pages = full.fullTextAnnotation?.pages || [];
    pages.forEach((page: any) => {
      (page.blocks || []).forEach((block: any) => {
        (block.paragraphs || []).forEach((para: any) => {
          (para.words || []).forEach((word: any) => {
            const symbols = word.symbols || [];
            const wordText = symbols.map((s: any) => s.text || '').join('');
            if (!wordText) return;
            const vertices = (word.boundingBox && word.boundingBox.vertices) || [];
            const xs = vertices.map((v: any) => v.x || 0);
            const ys = vertices.map((v: any) => v.y || 0);
            const x = xs.reduce((a: number, b: number) => a + b, 0) / (xs.length || 1);
            const y = ys.reduce((a: number, b: number) => a + b, 0) / (ys.length || 1);
            words.push({ text: wordText, x, y });
          });
        });
      });
    });
    return words;
  };

  const words = collectWords();
  if (!words.length) {
    const fallbackText = full.fullTextAnnotation?.text || full.textAnnotations?.[0]?.description;
    if (!fallbackText) throw new Error('لم يتم إرجاع أي نص من خدمة OCR.');
    const disambiguatedFallback = disambiguateArabicSixToTwo(String(fallbackText));
    return arabicToEnglishDigits(disambiguatedFallback);
  }

  const sortedByY = words.sort((a, b) => a.y - b.y);
  const rows: { y: number; cells: { text: string; x: number }[] }[] = [];
  const yThreshold = 20;
  sortedByY.forEach((w) => {
    const row = rows.find((r) => Math.abs(r.y - w.y) <= yThreshold);
    const cleanText = disambiguateArabicSixToTwo(w.text);
    if (row) {
      row.cells.push({ text: cleanText, x: w.x });
      row.y = (row.y + w.y) / 2;
    } else {
      rows.push({ y: w.y, cells: [{ text: cleanText, x: w.x }] });
    }
  });

  const lines = rows
    .sort((a, b) => a.y - b.y)
    .map((r) =>
      r.cells
        .sort((a, b) => a.x - b.x)
        .map((c) => c.text)
        .join(' ')
    )
    .join('\n');

  const normalized = arabicToEnglishDigits(lines);
  return normalized;
};

export default { extractTextFromImage };
