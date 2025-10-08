import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyProductDto {
  @ApiProperty({
    description: 'packageName',
    example: 'com.yourcompany.booket',
  })
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @ApiProperty({ description: 'productId', example: 'coin_1000' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'purchaseToken',
    example: 'abcde',
  })
  @IsString()
  @IsNotEmpty()
  purchaseToken: string;

  @ApiProperty({ description: 'userId', example: '686f73558a1162472f519ea0' })
  @IsString()
  userId: string;
}
