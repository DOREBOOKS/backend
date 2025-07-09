import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto';
import { UserInterface } from '../interfaces/user.interface';
import { ObjectId } from 'mongodb';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserInterface> {
    const user = this.userRepository.create(createUserDto);
    try {
      await this.userRepository.save(user);
      return this.mapToInterface(user);
    } catch (error) {
      // TODO : has to define error type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const code = error.code ?? error.driverError?.code;
      if (code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<UserInterface[]> {
    const users = await this.userRepository.find();
    return users.map((user) => this.mapToInterface(user));
  }

  async findOne(id: string): Promise<UserInterface> {
    const objectId = new ObjectId(id);
    const user = await this.userRepository.findOneBy({ _id: objectId });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return this.mapToInterface(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserInterface> {
    const objectId = new ObjectId(id);
    const user = await this.userRepository.findOneBy({ _id: objectId });
    if (!user) {
      throw new NotFoundException(
        `User with id ${objectId.toString()} not found`,
      );
    }
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);
    return this.mapToInterface(user);
  }

  async findByEmail(email: string): Promise<UserInterface | null> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return null;
    }
    return this.mapToInterface(user);
  }
  private mapToInterface(entity: UserEntity): UserInterface {
    return {
      id: entity._id.toHexString(),
      profilePic: entity.profilePic || '',
      password: entity.password, // Assuming password is not returned in the interface
      name: entity.name,
      email: entity.email,
      age: entity.age,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      point: entity.point,
    };
  }
}
