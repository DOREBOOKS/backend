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
import {
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  //전체 도서 조회 GET
  @Get()
  @ApiOperation({ summary: '모든 도서 조회' })
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
  @Get('search')
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
    return this.booksService.create({ ...createBookDto, book_pic: filePath });
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
