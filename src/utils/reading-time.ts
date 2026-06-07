const CJK_RE = /[一-鿿㐀-䶿豈-﫿぀-ゟ゠-ヿ가-힯]/g;
const WORD_RE = /[a-zA-Z0-9]+/g;

export function getReadingStats(body: string) {
  const cjkChars = (body.match(CJK_RE) || []).length;
  const noCJK = body.replace(CJK_RE, " ");
  const words = (noCJK.match(WORD_RE) || []).length;
  // CJK: ~400 chars/min, English: ~200 words/min
  const minutes = Math.max(1, Math.ceil(cjkChars / 400 + words / 200));
  const totalChars = cjkChars + words;
  return { chars: totalChars, cjkChars, words, minutes };
}
