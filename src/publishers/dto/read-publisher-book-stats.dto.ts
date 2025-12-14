import { ApiProperty } from '@nestjs/swagger';

export class PublisherBookStatsDto {
  @ApiProperty({ description: '총 도서 수' })
  totalBooks: number;

  @ApiProperty({ description: '중고거래 지원 도서 수(maxTransferCount > 0)' })
  usedTradeSupportedBooks: number;

  @ApiProperty({
    description: '오디오북 지원 도서 수(audioBookEnabled = true)',
  })
  audioBookEnabledBooks: number;

  @ApiProperty({ description: '중고거래 미지원 도서 수' })
  usedTradeNotSupportedBooks: number;
}
