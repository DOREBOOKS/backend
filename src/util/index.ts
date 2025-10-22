function normalizePrivateKey(raw?: string) {
  if (!raw) return raw;
  let key = raw.trim();
  // key = key.replace(/\\r/g, '');
  key = key.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'); // 양끝 따옴표 방어적 제거
  if (key.includes('\\n') && !key.includes('\n')) {
    key = key.replace(/\\n/g, '\n'); // \n => 진짜 줄바꿈
  }
  return key;
}

export { normalizePrivateKey };
