export function normalizePrivateKey(raw?: string) {
  if (!raw) return raw;

  let key = raw.trim(); // 1. 따옴표와 불필요한 공백 제거 (방어적)

  key = key.replace(/^['"]|['"]$/g, '').trim(); // 2. 'n' 대신 진짜 줄 바꿈 문자 '\n'으로 치환 (가장 중요)
  // 환경변수에 따라 \n 또는 \\n으로 저장될 수 있어, 모든 경우를 커버

  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  } // 3. Windows 환경의 \r 제거

  key = key.replace(/\r/g, ''); // 키 시작과 끝에 줄 바꿈이 없는 경우 대비

  if (!key.startsWith('-----BEGIN PRIVATE KEY-----\n')) {
    key = key.replace(
      '-----BEGIN PRIVATE KEY-----',
      '-----BEGIN PRIVATE KEY-----\n',
    );
  }
  if (!key.endsWith('\n-----END PRIVATE KEY-----')) {
    key = key.replace(
      '-----END PRIVATE KEY-----',
      '\n-----END PRIVATE KEY-----',
    );
  }

  return key;
}
