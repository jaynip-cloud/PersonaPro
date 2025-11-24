import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Extracting text from: ${file.name} (${file.type})`);

    let extractedText = '';

    if (file.type === 'application/pdf') {
      extractedText = await extractFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractFromDOCX(file);
    } else if (file.type === 'text/plain') {
      extractedText = await file.text();
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text extracted from document');
    }

    console.log(`Successfully extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        length: extractedText.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error('Error extracting document text:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to extract document text",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(uint8Array);

  const textMatches = content.match(/\(([^)]+)\)/g);
  let text = '';

  if (textMatches) {
    text = textMatches
      .map(match => match.slice(1, -1))
      .join(' ')
      .replace(/\\[0-9]{3}/g, ' ')
      .replace(/\\/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (text.length < 100) {
    text = content
      .replace(/[^\x20-\x7E\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (text.length < 100) {
    throw new Error('Could not extract sufficient text from PDF. The PDF may be image-based or encrypted.');
  }

  return text;
}

async function extractFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const JSZip = (await import('npm:jszip@3.10.1')).default;
  const zip = await JSZip.loadAsync(uint8Array);

  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing document.xml');
  }

  let text = documentXml
    .replace(/<w:t[^>]*>([^<]+)<\/w:t>/g, '$1 ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 50) {
    throw new Error('Could not extract sufficient text from DOCX');
  }

  return text;
}
