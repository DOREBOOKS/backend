function normalizePrivateKey(raw?: string) {
  if (!raw) return raw;
  console.log('Normalizing private key');
  console.log('raw: ', raw.slice(0, 30) + '...'); // 로그에 전체 키가 노출되지 않도록 일부만 출력
  let key = raw.trim();
  key = key.replace(/\\r/g, '');
  key = key.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'); // 양끝 따옴표 방어적 제거
  if (key.includes('\\n') && !key.includes('\n')) {
    key = key.replace(/\\n/g, '\n'); // \n => 진짜 줄바꿈
  }
  return key;
}

export { normalizePrivateKey };
