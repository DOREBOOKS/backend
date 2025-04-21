import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
    private readonly users = [
        {id : 1, name : '유진'},
        {id : 2, name : '승진'}
    ];

    findAll() {
        return this.users;
    }
}
