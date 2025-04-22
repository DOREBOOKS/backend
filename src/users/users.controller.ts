import { Body, Controller, Get, Post, Param, Patch, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}
    
    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body(new ValidationPipe({
        whitelist: true,
        transform: true,
        skipMissingProperties: true,
      })) updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }
}
