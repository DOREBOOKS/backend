import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BooksService } from '../service/book.service';
import { CreateBookDto } from '../dto/book.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  //전체 도서 조회 GET
  @Get()
  @ApiOperation({ summary: '모든 도서서 조회' })
  @ApiResponse({ status: 200, description: '모든 도서 반환.' })
  findAll() {
    return this.booksService.findAll();
  }

  //개별 도서 조회 GET
  @Get(':bookId')
  @ApiOperation({ summary: 'ID로 도서 조회' })
  @ApiParam({ name: 'bookId', description: '도서 ID' })
  @ApiResponse({ status: 200, description: '조회된 도서 반환.' })
  @ApiResponse({ status: 404, description: '사용자 없음.' })
  findOne(@Param('bookId') id: string) {
    return this.booksService.findOne(id);
  }

  //도서 이름으로 조회 GET
  @Get()
  @ApiOperation({ summary: '도서 전체 또는 제목으로 조회' })
  @ApiResponse({ status: 200, description: '조회된 도서 또는 전체 도서 반환' })
  async findAllOrByTitle(@Query('bookTitle') bookTitle?: string) {
    if (bookTitle) {
      return this.booksService.findByTitle(bookTitle);
    }
    return this.booksService.findAll();
  }

  //도서 등록 POST
  @Post()
  @ApiOperation({ summary: '새 도서 등록' })
  @ApiResponse({ status: 201, description: '생성된 도서 반환.' })
  @ApiResponse({ status: 400, description: '잘못된 요청.' })
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  //도서 삭제 DELETE
  @Delete(':bookId')
  @ApiOperation({ summary: '도서 삭제' })
  @ApiResponse({ status: 201, description: '도서 삭제 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '해당 도서 없음' })
  delete(@Param('bookId') id: string) {
    return this.booksService.delete(id);
  }
  /*@Post()
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
    update(@Param('id') id: string, @Body(new ValidationPipe({
        whitelist: true,
        transform: true,
        skipMissingProperties: true,
      })) updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }*/
}
