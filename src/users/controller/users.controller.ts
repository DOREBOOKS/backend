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
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import {
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
  @UseInterceptors(
    FileInterceptor('profile_pic', {
      storage: diskStorage({
        destination: './uploads/users',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `user-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '새 사용자 생성' })
  @ApiResponse({ status: 201, description: '생성된 사용자 반환.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  @ApiResponse({ status: 409, description: 'email 중복' })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createUserDto: CreateUserDto,
  ) {
    const filePath = file ? `/uploads/users/${file.filename}` : undefined;
    return this.usersService.create({
      ...createUserDto,
      profilePic: filePath,
    });
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('profile_pic', {
      storage: diskStorage({
        destination: './uploads/users',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `user-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        skipMissingProperties: true,
      }),
    )
    updateUserDto: UpdateUserDto,
  ) {
    const filePath = file ? `/uploads/users/${file.filename}` : undefined;
    return this.usersService.update(id, {
      ...updateUserDto,
      ...(filePath && { profilePic: filePath }),
    });
  }
}
