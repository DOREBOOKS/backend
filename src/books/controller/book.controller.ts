import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BooksService } from '../service/book.service';
import { CreateBookDto } from '../dto/create-book.dto';
import { BookType, BookStatus } from '../entities/book.entity';
import {
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  //전체 도서 조회 GET
  @Get('all')
  @ApiOperation({ summary: '모든 도서 조회' })
  @ApiResponse({ status: 200, description: '모든 도서 반환.' })
  findAll() {
    return this.booksService.findAll();
  }

  //전체도서 리스트 조회(필터 및 중고정보 포함)
  @Get()
  @ApiOperation({ summary: '도서 리스트 조회(필터 및 중고정보 포함)' })
  // @ApiQuery({
  //   name: 'type',
  //   required: false,
  //   enum: BookType,
  //   description: '도서 유형',
  // })
  @ApiQuery({ name: 'category', required: false, description: '도서 카테고리' })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: '정렬 방식 (popular, recent)',
  })
  @ApiResponse({ status: 200, description: '도서 리스트 반환' })
  async findBooks(
    //@Query('type') type?: BookType,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ) {
    return this.booksService.findBooks({ category, sort });
  }

  //도서 이름으로 조회 GET
  @Get('search')
  @ApiOperation({ summary: '도서 전체 또는 제목으로 조회' })
  @ApiResponse({ status: 200, description: '조회된 도서 또는 전체 도서 반환' })
  async findAllOrByTitle(@Query('bookTitle') bookTitle?: string) {
    if (bookTitle) {
      return this.booksService.findByTitle(bookTitle);
    }
    return this.booksService.findAll();
  }

  @Get('search/suggest')
  @ApiOperation({ summary: '검색 제안어' })
  @ApiQuery({ name: 'q', required: true, description: '검색어(부분일치)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '최대 개수(기본 10)',
  })
  async suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    const take = Number(limit) || 10;
    return this.booksService.searchSuggest(q, take);
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

  //도서 등록 POST
  @Post()
  @UseInterceptors(
    FileInterceptor('book_pic', {
      storage: diskStorage({
        destination: './uploads/books', // 실제 저장 경로
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `book-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiOperation({ summary: '새 도서 등록' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: '생성된 도서 반환.' })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body(new ValidationPipe({ transform: true })) createBookDto: CreateBookDto,
  ) {
    const filePath = file ? `/uploads/books/${file.filename}` : '';
    const finalBookDto: CreateBookDto = {
      ...createBookDto,
      book_pic: filePath,
      type: BookType.NEW, // '신규' 고정
      //status: BookStatus.SALE, // '판매중' 고정
    };

    return this.booksService.create(finalBookDto);
    //return this.booksService.create({ ...createBookDto, book_pic: filePath });
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
}
