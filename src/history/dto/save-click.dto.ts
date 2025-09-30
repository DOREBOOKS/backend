import { IsOptional, IsString, Length } from 'class-validator';

export class SaveSuggestClickDto {
  @IsString()
  @Length(1, 200)
  keyword: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  bookId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  bookTitle?: string;
}
