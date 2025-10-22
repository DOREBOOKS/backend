// src/util.ts
import * as crypto from 'crypto';

/**
 * ENV에 들어온 서비스계정 개인키(PEM)를 정규화:
 * - 양끝 따옴표 제거
 * - CR 제거
 * - 리터럴 "\n" → 실제 개행
 * - 깨진 헤더/푸터("BEGINPRIVATEKEY", 'n' 고립) 보정
 * - 최종 PEM 파싱 검증
 */
export function normalizePrivateKey(raw?: string) {
  if (!raw) throw new Error('Empty private key');

  let s = String(raw).trim();

  // 1) 양끝 따옴표 제거 (배포 환경에 따라 값이 "..." / '...'로 감싸져 올 수 있음)
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }

  // 2) CR 제거 (Windows CRLF 보호)
  s = s.replace(/\r/g, '');

  // 3) 리터럴 "\n" → 실제 개행 (ENV에 \n 두 문자로 저장된 경우)
  if (s.includes('\\n')) s = s.replace(/\\n/g, '\n');

  // 4) 깨진 헤더/푸터 보정
  //    - BEGINPRIVATEKEY / ENDPRIVATEKEY 처럼 붙은 케이스
  //    - 헤더/푸터 주변에 문자 'n'만 남은 케이스 (역슬래시가 사라질 때 흔함)
  s = s
    // 헤더 표준화 + 헤더 뒤 개행 보장
    .replace(/-+BEGIN\s*PRIVATE\s*KEY-+/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----BEGIN PRIVATE KEY-----\s*/i, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/-----BEGINPRIVATEKEY-----n/i, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/-----BEGINPRIVATEKEY-----/i, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/(-----BEGIN PRIVATE KEY-----)n/i, '$1\n')
    // 푸터 표준화 + 푸터 앞 개행 보장
    .replace(/-+END\s*PRIVATE\s*KEY-+/i, '-----END PRIVATE KEY-----')
    .replace(/\s*-----END PRIVATE KEY-----$/i, '\n-----END PRIVATE KEY-----')
    .replace(/n-----ENDPRIVATEKEY-----/i, '\n-----END PRIVATE KEY-----')
    .replace(/-----ENDPRIVATEKEY-----/i, '-----END PRIVATE KEY-----')
    .replace(/n(-----END PRIVATE KEY-----)/i, '\n$1');

  // 푸터 끝에 개행 하나 유지(선택)
  if (!s.endsWith('\n')) s += '\n';

  // 5) 최종 PEM 파싱 검증 (깨져있으면 여기서 에러 발생 → 문제를 조기에 발견)
  crypto.createPrivateKey({ key: s, format: 'pem' });

  return s;
}
