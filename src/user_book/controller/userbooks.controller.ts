import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserBooksService } from '../service/userbooks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('userbooks')
@Controller('userbooks')
export class UserBooksController {
  constructor(private readonly userbooksService: UserBooksService) {}

  //유저별 도서 조회 조회 GET
  @Get('users')
  @ApiOperation({ summary: '유저별 도서 조회' })
  @ApiResponse({ status: 200, description: '모든 유저별 도서 반환' })
  findByUserId(@CurrentUser() user: any) {
    const userId = user.id ?? user._id ?? user.sub;
    return this.userbooksService.findByUserId(userId);
  }

  @Get('download/:userBookId')
  @ApiOperation({ summary: '도서 다운로드' })
  @ApiParam({ name: 'userBookId', description: 'userBook ID' })
  @ApiResponse({ status: 200, description: '도서 다운로드' })
  async findBookUrl(
    @CurrentUser() user: any,
    @Param('userBookId') userBookId: string,
  ) {
    const userId = user.id ?? user._id ?? user.sub; //TODO : has to fix
    const url = await this.userbooksService.findBookUrlWithUserBookId(
      userId,
      userBookId,
    );
    return { cdn_url: url };
  }

  @Put('/deduct/remain-time/:userBookId')
  @ApiOperation({ summary: '유저 도서 남은 시간 차감' })
  @ApiParam({ name: 'userBookId', description: 'userBook ID' })
  @ApiResponse({ status: 200, description: '남은 시간 차감 완료' })
  async deductRemainTime(
    @CurrentUser() user: any,
    @Param('userBookId') userBookId: string,
    @Body() body: { deductTime: number },
  ) {
    const userId = user.id ?? user._id ?? user.sub; //TODO : has to fix
    return await this.userbooksService.deductRemainTime(
      userId,
      userBookId,
      body.deductTime,
    );
  }
}
