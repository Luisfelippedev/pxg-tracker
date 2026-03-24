import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Char } from './char.entity';

@Injectable()
export class CharsService {
  constructor(
    @InjectRepository(Char)
    private readonly charRepository: Repository<Char>,
  ) {}

  findAll(userId: string) {
    return this.charRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  create(userId: string, name: string) {
    return this.charRepository.save(
      this.charRepository.create({ userId, name: name.trim() }),
    );
  }

  async update(userId: string, id: string, name: string) {
    const char = await this.charRepository.findOne({ where: { id, userId } });
    if (!char) throw new NotFoundException('Char não encontrado');
    char.name = name.trim();
    return this.charRepository.save(char);
  }

  async remove(userId: string, id: string) {
    const result = await this.charRepository.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Char não encontrado');
    return { success: true };
  }
}
