import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Client, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

export interface AssigneeDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ClientLookupDto {
  id: string;
  name: string;
}

@Injectable()
export class TasksLookupService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getAssignees(user: User): Promise<AssigneeDto[]> {
    let users: User[];

    if (user.role === UserRole.ADMIN) {
      users = await this.userRepository.find({
        where: { role: UserRole.ADMIN, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    } else if (user.companyId) {
      users = await this.userRepository.find({
        where: { companyId: user.companyId, isActive: true },
        select: ['id', 'firstName', 'lastName', 'email'],
        order: { firstName: 'ASC', lastName: 'ASC' },
      });
    } else {
      users = [];
    }

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    }));
  }

  async getClients(user: User): Promise<ClientLookupDto[]> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const clients = await this.clientRepository.find({
      where: { companyId, isActive: true },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }
}
