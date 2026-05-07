/* ─── PDF.js CDN loader + text extraction utility ───
   Shared by PlagiarismCheckerPage & StudentPlagiarismCheckPage.
   Uses jsdelivr (mirrors npm directly) so any published version works. */

const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

let pdfjsLib: any = null;
let _loadPromise: Promise<any> | null = null;

export async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if ((window as any).pdfjsLib) {
    pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
    return pdfjsLib;
  }
  // Deduplicate concurrent calls
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
        resolve(pdfjsLib);
      } else {
        _loadPromise = null;
        reject(new Error("PDF.js script loaded but pdfjsLib not found on window"));
      }
    };
    script.onerror = () => {
      _loadPromise = null;
      reject(new Error(`Failed to load PDF.js from ${script.src}`));
    };
    document.head.appendChild(script);
  });

  return _loadPromise;
}

/** Extract all text from a PDF File. Returns concatenated text + page count. */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (msg: string) => void,
): Promise<{ text: string; pageCount: number }> {
  const lib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  const pageCount: number = pdf.numPages;
  let fullText = "";

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`Extracting page ${i}/${pageCount}...`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(" ") + "\n\n";
  }

  return { text: fullText.trim(), pageCount };
}
