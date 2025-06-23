import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from '../service/users.service';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '모든 사용자 조회' })
  @ApiResponse({ status: 200, description: '모든 사용자 반환.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID로 사용자 조회' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '조회된 사용자 반환.' })
  @ApiResponse({ status: 404, description: '사용자 없음.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '새 사용자 생성' })
  @ApiResponse({ status: 201, description: '생성된 사용자 반환.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  @ApiResponse({ status: 409, description: 'email 중복' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '수정된 사용자 반환.' })
  @ApiResponse({ status: 404, description: '사용자 없음.' })
  update(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        skipMissingProperties: true,
      }),
    )
    updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }
}
