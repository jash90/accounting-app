import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import {
  AIConfiguration,
  AIConversation,
  AIMessage,
  AIMessageRole,
  AIProvider,
  AmlGroup,
  Client,
  ClientReliefPeriod,
  ClientSuspension,
  Company,
  CompanyModuleAccess,
  DocumentTemplate,
  EmailAutoReplyTemplate,
  EmploymentType,
  GeneratedDocument,
  Lead,
  LeadSource,
  LeadStatus,
  Module as ModuleEntity,
  MonthlySettlement,
  Notification,
  NotificationType,
  Offer,
  OfferActivity,
  OfferActivityType,
  OfferStatus,
  OfferTemplate,
  ReliefType,
  SettlementComment,
  SettlementSettings,
  SettlementStatus,
  Task,
  TaskComment,
  TaskDependency,
  TaskDependencyType,
  TaskLabel,
  TaskLabelAssignment,
  TaskPriority,
  TaskStatus,
  TaxScheme,
  TimeEntry,
  TimeEntryStatus,
  TimeRoundingMethod,
  TimeSettings,
  TokenUsage,
  User,
  UserModulePermission,
  UserRole,
  VatStatus,
  ZusStatus,
} from '@accounting/common';

@Injectable()
export class DemoDataSeederService {
  private readonly logger = new Logger(DemoDataSeederService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(ModuleEntity) private moduleRepo: Repository<ModuleEntity>,
    @InjectRepository(CompanyModuleAccess)
    private moduleAccessRepo: Repository<CompanyModuleAccess>,
    @InjectRepository(UserModulePermission)
    private permissionRepo: Repository<UserModulePermission>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(ClientSuspension) private suspensionRepo: Repository<ClientSuspension>,
    @InjectRepository(ClientReliefPeriod) private reliefRepo: Repository<ClientReliefPeriod>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(TaskLabel) private labelRepo: Repository<TaskLabel>,
    @InjectRepository(TaskLabelAssignment) private labelAssignRepo: Repository<TaskLabelAssignment>,
    @InjectRepository(TaskDependency) private dependencyRepo: Repository<TaskDependency>,
    @InjectRepository(TaskComment) private taskCommentRepo: Repository<TaskComment>,
    @InjectRepository(TimeEntry) private timeEntryRepo: Repository<TimeEntry>,
    @InjectRepository(TimeSettings) private timeSettingsRepo: Repository<TimeSettings>,
    @InjectRepository(MonthlySettlement) private settlementRepo: Repository<MonthlySettlement>,
    @InjectRepository(SettlementComment)
    private settlementCommentRepo: Repository<SettlementComment>,
    @InjectRepository(SettlementSettings)
    private settlementSettingsRepo: Repository<SettlementSettings>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(OfferTemplate) private offerTemplateRepo: Repository<OfferTemplate>,
    @InjectRepository(Offer) private offerRepo: Repository<Offer>,
    @InjectRepository(OfferActivity) private offerActivityRepo: Repository<OfferActivity>,
    @InjectRepository(DocumentTemplate) private docTemplateRepo: Repository<DocumentTemplate>,
    @InjectRepository(GeneratedDocument) private generatedDocRepo: Repository<GeneratedDocument>,
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
    @InjectRepository(EmailAutoReplyTemplate)
    private emailAutoReplyRepo: Repository<EmailAutoReplyTemplate>,
    @InjectRepository(AIConfiguration) private aiConfigRepo: Repository<AIConfiguration>,
    @InjectRepository(AIConversation) private aiConversationRepo: Repository<AIConversation>,
    @InjectRepository(AIMessage) private aiMessageRepo: Repository<AIMessage>,
    @InjectRepository(TokenUsage) private tokenUsageRepo: Repository<TokenUsage>
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting demo data seeding...');

    if (await this.isDemoDataSeeded()) {
      this.logger.warn('Demo data already seeded (Biuro Rachunkowe Nowak exists). Skipping.');
      return;
    }

    const { companyA, ownerA, employeesA } = await this.getExistingCompanyA();
    const { companyB, ownerB, employeesB } = await this.seedCompanyB();

    const modules = await this.moduleRepo.find({ where: { isActive: true } });

    await this.seedModuleAccess(companyB, modules);
    await this.seedEmployeePermissions(employeesB, modules, ownerB);

    const clientsA = await this.seedClients(companyA, ownerA, 12);
    const clientsB = await this.seedClients(companyB, ownerB, 15);

    await this.seedClientAddons(companyA, ownerA, clientsA);
    await this.seedClientAddons(companyB, ownerB, clientsB);

    const tasksA = await this.seedTasks(companyA, ownerA, employeesA, clientsA);
    const tasksB = await this.seedTasks(companyB, ownerB, employeesB, clientsB);

    await this.seedTimeSettings(companyA);
    await this.seedTimeSettings(companyB);

    await this.seedSettlementSettings(companyA);
    await this.seedSettlementSettings(companyB);

    const allClientsA = await this.clientRepo.find({
      where: { companyId: companyA.id, isActive: true },
    });
    const allClientsB = await this.clientRepo.find({
      where: { companyId: companyB.id, isActive: true },
    });

    const settlementsA = await this.seedSettlements(companyA, ownerA, employeesA, allClientsA);
    const settlementsB = await this.seedSettlements(companyB, ownerB, employeesB, allClientsB);

    await this.seedTimeEntries(companyA, ownerA, employeesA, clientsA, tasksA, settlementsA);
    await this.seedTimeEntries(companyB, ownerB, employeesB, clientsB, tasksB, settlementsB);

    await this.seedLeads(companyA, ownerA, employeesA);
    await this.seedLeads(companyB, ownerB, employeesB);

    await this.seedOffers(companyA, ownerA, clientsA);
    await this.seedOffers(companyB, ownerB, clientsB);

    await this.seedDocuments(companyA, ownerA);
    await this.seedDocuments(companyB, ownerB);

    await this.seedNotifications(companyA, ownerA, employeesA);
    await this.seedNotifications(companyB, ownerB, employeesB);

    await this.seedEmailAutoReply(companyA);
    await this.seedEmailAutoReply(companyB);

    await this.seedAIData(companyA, ownerA);
    await this.seedAIData(companyB, ownerB);

    this.logger.log('Demo data seeding completed!');
    this.logger.log('Company B credentials:');
    this.logger.log('  Owner:      nowak@biuro-nowak.pl / Demo12345678!');
    this.logger.log('  Employee 1: a.kowalska@biuro-nowak.pl / Demo12345678!');
    this.logger.log('  Employee 2: m.wisniewski@biuro-nowak.pl / Demo12345678!');
  }

  private async isDemoDataSeeded(): Promise<boolean> {
    const existing = await this.companyRepo.findOne({ where: { name: 'Biuro Rachunkowe Nowak' } });
    return existing !== null;
  }

  private async getExistingCompanyA(): Promise<{
    companyA: Company;
    ownerA: User;
    employeesA: User[];
  }> {
    const companyA = await this.companyRepo.findOneOrFail({ where: { name: 'Tech Startup A' } });
    const ownerA = await this.userRepo.findOneOrFail({
      where: { companyId: companyA.id, role: UserRole.COMPANY_OWNER },
    });
    const employeesA = await this.userRepo.find({
      where: { companyId: companyA.id, role: UserRole.EMPLOYEE },
    });
    return { companyA, ownerA, employeesA };
  }

  private async seedCompanyB(): Promise<{ companyB: Company; ownerB: User; employeesB: User[] }> {
    const password = await bcrypt.hash('Demo12345678!', 10);

    const ownerB = await this.userRepo.save(
      this.userRepo.create({
        email: 'nowak@biuro-nowak.pl',
        password,
        firstName: 'Krzysztof',
        lastName: 'Nowak',
        role: UserRole.COMPANY_OWNER,
        isActive: true,
      })
    );

    const companyB = await this.companyRepo.save(
      this.companyRepo.create({
        name: 'Biuro Rachunkowe Nowak',
        ownerId: ownerB.id,
        isActive: true,
        nip: '7654321890',
        regon: '123456789',
        street: 'ul. Długa 15',
        city: 'Kraków',
        postalCode: '30-001',
        country: 'Polska',
        ownerFirstName: 'Krzysztof',
        ownerLastName: 'Nowak',
        ownerEmail: 'nowak@biuro-nowak.pl',
        bankAccount: 'PL61109010140000071219812874',
      })
    );

    ownerB.companyId = companyB.id;
    await this.userRepo.save(ownerB);

    const emp1 = await this.userRepo.save(
      this.userRepo.create({
        email: 'a.kowalska@biuro-nowak.pl',
        password,
        firstName: 'Anna',
        lastName: 'Kowalska',
        role: UserRole.EMPLOYEE,
        companyId: companyB.id,
        isActive: true,
      })
    );

    const emp2 = await this.userRepo.save(
      this.userRepo.create({
        email: 'm.wisniewski@biuro-nowak.pl',
        password,
        firstName: 'Marek',
        lastName: 'Wiśniewski',
        role: UserRole.EMPLOYEE,
        companyId: companyB.id,
        isActive: true,
      })
    );

    return { companyB, ownerB, employeesB: [emp1, emp2] };
  }

  private async seedModuleAccess(company: Company, modules: ModuleEntity[]): Promise<void> {
    for (const module of modules) {
      await this.moduleAccessRepo.save(
        this.moduleAccessRepo.create({
          companyId: company.id,
          moduleId: module.id,
          isEnabled: true,
        })
      );
    }
    this.logger.log(`Enabled ${modules.length} modules for ${company.name}`);
  }

  private async seedEmployeePermissions(
    employees: User[],
    modules: ModuleEntity[],
    grantedBy: User
  ): Promise<void> {
    for (const employee of employees) {
      for (const module of modules) {
        const permissions = module.defaultPermissions ?? ['read', 'write'];
        await this.permissionRepo.save(
          this.permissionRepo.create({
            userId: employee.id,
            moduleId: module.id,
            permissions,
            grantedById: grantedBy.id,
          })
        );
      }
    }
    this.logger.log(`Granted permissions to ${employees.length} employees`);
  }

  private async seedClients(company: Company, owner: User, count: number): Promise<Client[]> {
    const clientData = [
      {
        name: 'Apex Consulting',
        nip: '1112223334',
        pkd: '69.20.Z',
        city: 'Warszawa',
        emp: EmploymentType.DG,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.PIT_19,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'BuildTech Polska',
        nip: '2223334445',
        pkd: '41.20.Z',
        city: 'Kraków',
        emp: EmploymentType.DG_ETAT,
        vat: VatStatus.VAT_QUARTERLY,
        tax: TaxScheme.LUMP_SUM,
        zus: ZusStatus.PREFERENTIAL,
        aml: AmlGroup.LOW,
      },
      {
        name: 'CaféCulture Sp. k.',
        nip: '3334445556',
        pkd: '56.10.A',
        city: 'Wrocław',
        emp: EmploymentType.DG_AKCJONARIUSZ,
        vat: VatStatus.NO,
        tax: TaxScheme.GENERAL,
        zus: ZusStatus.NONE,
        aml: AmlGroup.LOW,
      },
      {
        name: 'DataStream Analytics',
        nip: '4445556667',
        pkd: '62.01.Z',
        city: 'Gdańsk',
        emp: EmploymentType.DG_HALF_TIME_BELOW_MIN,
        vat: VatStatus.NO_WATCH_LIMIT,
        tax: TaxScheme.PIT_17,
        zus: ZusStatus.FULL,
        aml: AmlGroup.ELEVATED,
      },
      {
        name: 'EcoFarm Sp. z o.o.',
        nip: '5556667778',
        pkd: '01.11.Z',
        city: 'Poznań',
        emp: EmploymentType.DG_HALF_TIME_ABOVE_MIN,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.PIT_19,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'FlexWork Solutions',
        nip: '6667778889',
        pkd: '78.20.Z',
        city: 'Łódź',
        emp: EmploymentType.DG,
        vat: VatStatus.VAT_QUARTERLY,
        tax: TaxScheme.LUMP_SUM,
        zus: ZusStatus.PREFERENTIAL,
        aml: AmlGroup.LOW,
      },
      {
        name: 'GreenLogistics',
        nip: '7778889990',
        pkd: '49.41.Z',
        city: 'Szczecin',
        emp: EmploymentType.DG_ETAT,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.GENERAL,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'HealthCare Partners',
        nip: '8889990001',
        pkd: '86.22.Z',
        city: 'Bydgoszcz',
        emp: EmploymentType.DG,
        vat: VatStatus.NO,
        tax: TaxScheme.PIT_17,
        zus: ZusStatus.NONE,
        aml: AmlGroup.HIGH,
      },
      {
        name: 'iDesign Studio',
        nip: '9990001112',
        pkd: '74.10.Z',
        city: 'Katowice',
        emp: EmploymentType.DG_AKCJONARIUSZ,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.PIT_19,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'JurisLex Kancelaria',
        nip: '1112223335',
        pkd: '69.10.Z',
        city: 'Lublin',
        emp: EmploymentType.DG_ETAT,
        vat: VatStatus.VAT_QUARTERLY,
        tax: TaxScheme.LUMP_SUM,
        zus: ZusStatus.PREFERENTIAL,
        aml: AmlGroup.ELEVATED,
      },
      {
        name: 'KidsCare Edukacja',
        nip: '2223334446',
        pkd: '85.10.Z',
        city: 'Białystok',
        emp: EmploymentType.DG,
        vat: VatStatus.NO,
        tax: TaxScheme.GENERAL,
        zus: ZusStatus.NONE,
        aml: AmlGroup.LOW,
      },
      {
        name: 'LandScape Design',
        nip: '3334445557',
        pkd: '81.30.Z',
        city: 'Rzeszów',
        emp: EmploymentType.DG_HALF_TIME_BELOW_MIN,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.PIT_17,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'MediaMix Agency',
        nip: '4445556668',
        pkd: '73.11.Z',
        city: 'Olsztyn',
        emp: EmploymentType.DG,
        vat: VatStatus.VAT_QUARTERLY,
        tax: TaxScheme.PIT_19,
        zus: ZusStatus.PREFERENTIAL,
        aml: AmlGroup.LOW,
      },
      {
        name: 'NanoTech Innovations',
        nip: '5556667779',
        pkd: '72.19.Z',
        city: 'Opole',
        emp: EmploymentType.DG_HALF_TIME_ABOVE_MIN,
        vat: VatStatus.VAT_MONTHLY,
        tax: TaxScheme.LUMP_SUM,
        zus: ZusStatus.FULL,
        aml: AmlGroup.STANDARD,
      },
      {
        name: 'OceanPrint Sp. z o.o.',
        nip: '6667778890',
        pkd: '18.12.Z',
        city: 'Toruń',
        emp: EmploymentType.DG_ETAT,
        vat: VatStatus.NO_WATCH_LIMIT,
        tax: TaxScheme.GENERAL,
        zus: ZusStatus.NONE,
        aml: AmlGroup.HIGH,
      },
    ];

    const suffix = company.name.includes('Nowak') ? 'B' : 'A';
    const saved: Client[] = [];
    const years = ['2020', '2021', '2022', '2023'];
    const months = ['01', '03', '06', '09'];

    for (let i = 0; i < Math.min(count, clientData.length); i++) {
      const d = clientData[i];
      const client = await this.clientRepo.save(
        this.clientRepo.create({
          name: `${d.name} (${suffix})`,
          nip: `${suffix}${d.nip.slice(1)}`,
          email: `kontakt@${d.name
            .toLowerCase()
            .replace(/[^a-z]/g, '')
            .slice(0, 12)}.pl`,
          phone: `+48 ${500000000 + i * 7654321}`,
          pkdCode: d.pkd,
          companyStartDate: new Date(`${years[i % 4]}-${months[i % 4]}-01`),
          cooperationStartDate: new Date(`${years[(i + 1) % 4]}-${months[(i + 2) % 4]}-01`),
          companySpecificity: `Firma z branży ${d.pkd} w ${d.city}`,
          employmentType: d.emp,
          vatStatus: d.vat,
          taxScheme: d.tax,
          zusStatus: d.zus,
          amlGroupEnum: d.aml,
          companyId: company.id,
          createdById: owner.id,
          isActive: true,
        })
      );
      saved.push(client);
    }

    this.logger.log(`Seeded ${saved.length} clients for ${company.name}`);
    return saved;
  }

  private async seedClientAddons(company: Company, owner: User, clients: Client[]): Promise<void> {
    for (let i = 0; i < Math.min(2, clients.length); i++) {
      await this.suspensionRepo.save(
        this.suspensionRepo.create({
          companyId: company.id,
          clientId: clients[i].id,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-03-31'),
          reason: 'Zawieszenie działalności na czas zimy',
          createdById: owner.id,
        })
      );
    }

    const reliefTypes = [ReliefType.ULGA_NA_START, ReliefType.MALY_ZUS];
    const reliefEnds = [new Date('2025-12-01'), new Date('2028-06-01')];
    for (let i = 2; i < Math.min(4, clients.length); i++) {
      await this.reliefRepo.save(
        this.reliefRepo.create({
          companyId: company.id,
          clientId: clients[i].id,
          reliefType: reliefTypes[(i - 2) % 2],
          startDate: new Date('2025-06-01'),
          endDate: reliefEnds[(i - 2) % 2],
          isActive: true,
          createdById: owner.id,
        })
      );
    }
  }

  private async seedTasks(
    company: Company,
    owner: User,
    employees: User[],
    clients: Client[]
  ): Promise<Task[]> {
    const labelDefs = [
      { name: 'VAT', color: '#ef4444' },
      { name: 'PIT', color: '#f97316' },
      { name: 'ZUS', color: '#3b82f6' },
      { name: 'Pilne', color: '#8b5cf6' },
      { name: 'Automatyzacja', color: '#22c55e' },
    ];
    const labels: TaskLabel[] = [];
    for (const def of labelDefs) {
      labels.push(
        await this.labelRepo.save(
          this.labelRepo.create({ ...def, companyId: company.id, createdById: owner.id })
        )
      );
    }

    const templateDefs = [
      {
        title: 'Rozliczenie VAT miesięczne',
        freq: 'monthly' as const,
        interval: 1,
        dayOfMonth: 25,
      },
      {
        title: 'Przegląd tygodniowy klientów',
        freq: 'weekly' as const,
        interval: 1,
        daysOfWeek: [1],
      },
      { title: 'Backup danych dzienny', freq: 'daily' as const, interval: 1 },
    ];
    for (const t of templateDefs) {
      await this.taskRepo.save(
        this.taskRepo.create({
          title: t.title,
          description: `Szablon zadania: ${t.title}`,
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          companyId: company.id,
          createdById: owner.id,
          isTemplate: true,
          recurrencePattern: {
            frequency: t.freq,
            interval: t.interval,
            ...(t.dayOfMonth ? { dayOfMonth: t.dayOfMonth } : {}),
            ...(t.daysOfWeek ? { daysOfWeek: t.daysOfWeek } : {}),
          },
          isActive: true,
          sortOrder: 0,
        })
      );
    }

    const statuses = [
      TaskStatus.BACKLOG,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ];
    const priorities = [
      TaskPriority.URGENT,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW,
      TaskPriority.NONE,
    ];
    const titles = [
      'Przygotowanie raportu rocznego',
      'Analiza kosztów Q4',
      'Wdrożenie systemu fakturowania',
      'Szkolenie z CIT',
      'Przegląd umów',
      'Złożenie deklaracji VAT-7',
      'Rozliczenie składek ZUS',
      'Aktualizacja danych klientów',
      'Przygotowanie zestawienia PIT',
      'Weryfikacja faktur',
      'Rozliczenie VAT za styczeń',
      'Kontrola podatku dochodowego',
      'Przegląd ewidencji VAT',
      'Korekta deklaracji ZUS',
      'Sprawozdanie finansowe',
      'Weryfikacja ksiąg rachunkowych',
      'Rozliczenia kwartalne',
      'Przegląd faktur sprzedaży',
      'Kontrola sald',
      'Analiza rentowności',
      'Złożenie JPK_VAT za grudzień',
      'Rozliczenie wynagrodzeń',
      'Zamknięcie ksiąg za 2025',
      'Bilansu otwarcia 2026',
      'Archiwizacja dokumentów',
      'Migracja do systemu XYZ',
      'Integracja API bankowego',
      'Wdrożenie modułu płatności',
      'Automatyzacja paragonów',
      'Raporty BI',
    ];

    const now = new Date();
    const saved: Task[] = [];

    for (let i = 0; i < 30; i++) {
      const status = statuses[Math.floor(i / 5)];
      const priority = priorities[i % 5];
      const assignee = employees.length > 0 ? employees[i % employees.length] : owner;
      const client = clients.length > 0 ? clients[i % clients.length] : undefined;

      let dueDate: Date | undefined;
      if (i >= 5 && i < 10) {
        dueDate = new Date(now.getTime() - (i - 4) * 24 * 60 * 60 * 1000);
      } else if (i >= 10 && i < 15) {
        dueDate = new Date(now.getTime() + (i - 9) * 24 * 60 * 60 * 1000);
      } else if (status !== TaskStatus.DONE && status !== TaskStatus.CANCELLED) {
        dueDate = new Date(now.getTime() + (i + 10) * 24 * 60 * 60 * 1000);
      }

      const task = await this.taskRepo.save(
        this.taskRepo.create({
          title: titles[i],
          description: `Opis zadania: ${titles[i]}. Wymaga weryfikacji i zatwierdzenia.`,
          status,
          priority,
          dueDate,
          estimatedMinutes: (i + 1) * 30,
          storyPoints: (i % 8) + 1,
          acceptanceCriteria: [
            { id: '1', text: 'Dokumenty kompletne', completed: status === TaskStatus.DONE },
            { id: '2', text: 'Zatwierdzenie kierownika', completed: status === TaskStatus.DONE },
          ],
          sortOrder: i,
          companyId: company.id,
          clientId: client?.id,
          assigneeId: assignee.id,
          createdById: owner.id,
          isActive: true,
        })
      );
      saved.push(task);

      // Override auto-set timestamps to produce meaningful durations
      let taskCreatedAt: Date;
      let taskUpdatedAt: Date;
      if (i < 5) {
        // BACKLOG: created 30-54 days ago
        taskCreatedAt = new Date(now.getTime() - (30 + i * 6) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(taskCreatedAt.getTime() + 2 * 60 * 60 * 1000);
      } else if (i < 10) {
        // TODO: created 20-36 days ago
        taskCreatedAt = new Date(now.getTime() - (20 + (i - 5) * 4) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(taskCreatedAt.getTime() + 3 * 60 * 60 * 1000);
      } else if (i < 15) {
        // IN_PROGRESS: created 10-18 days ago
        taskCreatedAt = new Date(now.getTime() - (10 + (i - 10) * 2) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(taskCreatedAt.getTime() + 5 * 60 * 60 * 1000);
      } else if (i < 20) {
        // IN_REVIEW: created 5-13 days ago
        taskCreatedAt = new Date(now.getTime() - (5 + (i - 15) * 2) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(taskCreatedAt.getTime() + 4 * 60 * 60 * 1000);
      } else if (i < 25) {
        // DONE: created 15-43 days ago, completed 1-9 days ago → 6-42 day durations
        taskCreatedAt = new Date(now.getTime() - (15 + (i - 20) * 7) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(now.getTime() - (1 + (i - 20) * 2) * 24 * 60 * 60 * 1000);
      } else {
        // CANCELLED: created 20-28 days ago
        taskCreatedAt = new Date(now.getTime() - (20 + (i - 25) * 2) * 24 * 60 * 60 * 1000);
        taskUpdatedAt = new Date(taskCreatedAt.getTime() + 6 * 60 * 60 * 1000);
      }
      await this.taskRepo
        .createQueryBuilder()
        .update()
        .set({ createdAt: taskCreatedAt, updatedAt: taskUpdatedAt })
        .where('id = :id', { id: task.id })
        .execute();

      if (i < 10) {
        await this.labelAssignRepo.save(
          this.labelAssignRepo.create({
            taskId: task.id,
            labelId: labels[i % labels.length].id,
            assignedById: owner.id,
          })
        );
      }
    }

    for (let i = 0; i < 3; i++) {
      await this.taskRepo.save(
        this.taskRepo.create({
          title: `Podzadanie: ${saved[i].title}`,
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          parentTaskId: saved[i].id,
          companyId: company.id,
          createdById: owner.id,
          isActive: true,
          sortOrder: 100 + i,
        })
      );
    }

    for (let i = 0; i < 3; i++) {
      await this.dependencyRepo.save(
        this.dependencyRepo.create({
          taskId: saved[i + 5].id,
          dependsOnTaskId: saved[i].id,
          dependencyType: TaskDependencyType.BLOCKED_BY,
          createdById: owner.id,
        })
      );
    }

    const comments = [
      'Proszę o pilne zajęcie się tym zadaniem.',
      'Dokumenty zostały przesłane na maila.',
      'Czekam na zatwierdzenie od klienta.',
      'Zadanie wymaga dodatkowej weryfikacji VAT.',
      'Ukończono - dokumenty w archiwum.',
    ];
    for (let i = 0; i < 5; i++) {
      await this.taskCommentRepo.save(
        this.taskCommentRepo.create({
          content: comments[i],
          taskId: saved[i].id,
          authorId: i % 2 === 0 ? owner.id : (employees[0]?.id ?? owner.id),
        })
      );
    }

    this.logger.log(`Seeded 30 tasks + 3 templates + 5 labels for ${company.name}`);
    return saved;
  }

  private async seedTimeEntries(
    company: Company,
    owner: User,
    employees: User[],
    clients: Client[],
    tasks: Task[],
    settlements: MonthlySettlement[] = []
  ): Promise<void> {
    const statuses = [
      TimeEntryStatus.DRAFT,
      TimeEntryStatus.SUBMITTED,
      TimeEntryStatus.APPROVED,
      TimeEntryStatus.REJECTED,
      TimeEntryStatus.BILLED,
    ];
    const allUsers = [owner, ...employees];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const status = statuses[Math.floor(i / 10)];
      const user = allUsers[i % allUsers.length];
      const client = clients.length > 0 ? clients[i % clients.length] : undefined;
      const task = tasks.length > 0 ? tasks[i % tasks.length] : undefined;
      const isBillable = i % 5 !== 0;
      const hourlyRate = 100 + (i % 5) * 50;
      const durationMinutes = 30 + (i % 8) * 30;
      const dayOffset = i < 25 ? -(i % 25) : -(25 + (i % 25));
      const startTime = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      startTime.setHours(8 + (i % 4), 0, 0, 0);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      const settlement =
        settlements.length > 0 && i % 3 === 0 ? settlements[i % settlements.length] : undefined;

      const entry: Partial<TimeEntry> = {
        description: `Praca nad: ${task?.title ?? 'projekt'} dla ${client?.name ?? 'klienta'}`,
        startTime,
        endTime,
        durationMinutes,
        isBillable,
        hourlyRate: isBillable ? hourlyRate : undefined,
        totalAmount: isBillable ? (hourlyRate * durationMinutes) / 60 : undefined,
        currency: 'PLN',
        status,
        tags: [i % 2 === 0 ? 'rozliczenia' : 'ksiegowosc'],
        companyId: company.id,
        userId: user.id,
        clientId: client?.id,
        taskId: task?.id,
        settlementId: settlement?.id,
        createdById: user.id,
        isActive: true,
        isRunning: false,
        isLocked: status === TimeEntryStatus.BILLED,
      };

      if (status === TimeEntryStatus.REJECTED) {
        entry.rejectionNote = 'Brakujące dokumenty potwierdzające czas pracy';
        entry.submittedAt = startTime;
      }
      if (status === TimeEntryStatus.APPROVED || status === TimeEntryStatus.BILLED) {
        entry.approvedById = owner.id;
        entry.approvedAt = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
        entry.submittedAt = startTime;
      }
      if (status === TimeEntryStatus.SUBMITTED) {
        entry.submittedAt = startTime;
      }
      if (status === TimeEntryStatus.BILLED) {
        entry.billedAt = new Date(startTime.getTime() + 48 * 60 * 60 * 1000);
        entry.lockedAt = new Date(startTime.getTime() + 48 * 60 * 60 * 1000);
        entry.lockedById = owner.id;
      }

      await this.timeEntryRepo.save(this.timeEntryRepo.create(entry as TimeEntry));
    }

    this.logger.log(`Seeded 50 time entries for ${company.name}`);
  }

  private async seedTimeSettings(company: Company): Promise<void> {
    await this.timeSettingsRepo.save(
      this.timeSettingsRepo.create({
        companyId: company.id,
        roundingMethod: TimeRoundingMethod.NEAREST,
        roundingIntervalMinutes: 15,
        defaultHourlyRate: 150,
        defaultCurrency: 'PLN',
        requireApproval: true,
        allowOverlappingEntries: false,
        workingHoursPerDay: 8,
        workingHoursPerWeek: 40,
        weekStartDay: 1,
        allowTimerMode: true,
        allowManualEntry: true,
        enableDailyReminder: true,
        dailyReminderTime: '08:00',
      })
    );
  }

  private async seedSettlementSettings(company: Company): Promise<void> {
    await this.settlementSettingsRepo.save(
      this.settlementSettingsRepo.create({
        companyId: company.id,
        defaultPriority: 0,
        defaultDeadlineDay: 20,
        autoAssignEnabled: false,
        notifyOnStatusChange: true,
        notifyOnDeadlineApproaching: true,
        deadlineWarningDays: 3,
      })
    );
  }

  private async seedSettlements(
    company: Company,
    owner: User,
    employees: User[],
    clients: Client[]
  ): Promise<MonthlySettlement[]> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const statuses = [
      SettlementStatus.PENDING,
      SettlementStatus.IN_PROGRESS,
      SettlementStatus.MISSING_INVOICE_VERIFICATION,
      SettlementStatus.MISSING_INVOICE,
      SettlementStatus.COMPLETED,
    ];

    const limitedClients = clients.slice(0, 15);
    let count = 0;
    const seeded: MonthlySettlement[] = [];

    for (const client of limitedClients) {
      for (let m = 0; m < 2; m++) {
        const month = m === 0 ? currentMonth : prevMonth;
        const year = m === 0 ? currentYear : prevYear;
        const status = statuses[count % statuses.length];
        const assignee = employees.length > 0 ? employees[count % employees.length] : owner;

        const settlement = await this.settlementRepo.save(
          this.settlementRepo.create({
            clientId: client.id,
            userId: assignee.id,
            assignedById: owner.id,
            month,
            year,
            status,
            invoiceCount: (count % 10) + 1,
            notes: count % 3 === 0 ? 'Wymaga dodatkowej weryfikacji faktur' : null,
            requiresAttention: count % 7 === 0,
            attentionReason: count % 7 === 0 ? 'Brakuje faktur kosztowych' : null,
            documentsComplete: status === SettlementStatus.COMPLETED,
            priority: count % 5,
            deadline: new Date(year, month - 1, 20),
            statusHistory: [
              {
                status: SettlementStatus.PENDING,
                changedAt: new Date(year, month - 1, 1).toISOString(),
                changedById: owner.id,
              },
            ],
            companyId: company.id,
          })
        );

        seeded.push(settlement);

        if (count % 5 === 0) {
          await this.settlementCommentRepo.save(
            this.settlementCommentRepo.create({
              settlementId: settlement.id,
              userId: owner.id,
              content: `Komentarz do rozliczenia ${month}/${year}: wymaga uwagi`,
              companyId: company.id,
            })
          );
        }
        count++;
      }
    }

    this.logger.log(`Seeded ${count} settlements for ${company.name}`);
    return seeded;
  }

  private async seedLeads(company: Company, owner: User, employees: User[]): Promise<void> {
    const leadStatuses = Object.values(LeadStatus);
    const leadSources = Object.values(LeadSource);
    const names = [
      'Firma Transportowa Nowak',
      'Restauracja Pod Lipą',
      'Auto Serwis Graczyk',
      'Kancelaria Wierzbicka',
      'Zakład Fryzjerski Monika',
      'Drukarnia Grafika',
      'Sklep Spożywczy ABC',
      'Hurtownia Elektryczna Volt',
      'Salon Urody Bella',
      'SystemNet IT',
      'Gabinet Dr. Kwiatkowski',
      'Fashion4You Odzież',
      'Biuro Nieruchomości Optimal',
      'Studio Architektoniczne Z',
      'MediaPro Reklama',
      'Espresso Corner',
      'Firma Budowlana Murex',
      'Hurtownia Budowlana Delta',
      'Sklep AGD Electra',
      'FotoArt Studio',
    ];
    const cities = [
      'Warszawa',
      'Kraków',
      'Wrocław',
      'Gdańsk',
      'Poznań',
      'Łódź',
      'Szczecin',
      'Lublin',
    ];

    for (let i = 0; i < 20; i++) {
      const assignee = employees.length > 0 ? employees[i % employees.length] : owner;
      await this.leadRepo.save(
        this.leadRepo.create({
          name: names[i],
          nip: `${(i + 1).toString().padStart(10, '0')}`,
          city: cities[i % cities.length],
          country: 'Polska',
          contactPerson: `Prezes ${names[i].split(' ').at(-1) ?? 'firmy'}`,
          contactPosition: 'Właściciel',
          email: `kontakt@${names[i]
            .toLowerCase()
            .replace(/[^a-z]/g, '')
            .slice(0, 14)}.pl`,
          phone: `+48 ${500000000 + i * 7777}`,
          status: leadStatuses[i % leadStatuses.length],
          source: leadSources[i % leadSources.length],
          notes: `Lead z ${leadSources[i % leadSources.length].toLowerCase()}. ${i % 3 === 0 ? 'Duży potencjał.' : 'Standardowy klient.'}`,
          estimatedValue: (i + 1) * 25000,
          assignedToId: assignee.id,
          companyId: company.id,
          createdById: owner.id,
        })
      );
    }

    this.logger.log(`Seeded 20 leads for ${company.name}`);
  }

  private async seedOffers(company: Company, owner: User, clients: Client[]): Promise<void> {
    const templateDefs = [
      {
        name: 'Pakiet Standard - Usługi Księgowe',
        isDefault: true,
        defaultVatRate: 23,
        defaultServiceItems: [
          { name: 'Prowadzenie ksiąg rachunkowych', unitPrice: 800, quantity: 1, unit: 'miesiąc' },
          { name: 'Rozliczenia ZUS', unitPrice: 200, quantity: 1, unit: 'miesiąc' },
          { name: 'Deklaracje podatkowe', unitPrice: 300, quantity: 1, unit: 'miesiąc' },
        ],
      },
      {
        name: 'Pakiet Premium - Pełna Obsługa',
        isDefault: false,
        defaultVatRate: 23,
        defaultServiceItems: [
          { name: 'Pełna księgowość', unitPrice: 1500, quantity: 1, unit: 'miesiąc' },
          { name: 'Doradztwo podatkowe', unitPrice: 500, quantity: 1, unit: 'miesiąc' },
          { name: 'Obsługa kadrowo-płacowa', unitPrice: 400, quantity: 1, unit: 'miesiąc' },
        ],
      },
      {
        name: 'Audyt Podatkowy',
        isDefault: false,
        defaultVatRate: 23,
        defaultServiceItems: [
          { name: 'Przegląd dokumentacji podatkowej', unitPrice: 2000, quantity: 1, unit: 'audyt' },
          { name: 'Raport z audytu', unitPrice: 500, quantity: 1, unit: 'dokument' },
        ],
      },
    ];

    const savedTemplates: OfferTemplate[] = [];
    for (const t of templateDefs) {
      savedTemplates.push(
        await this.offerTemplateRepo.save(
          this.offerTemplateRepo.create({
            ...t,
            companyId: company.id,
            createdById: owner.id,
            defaultValidityDays: 30,
            documentSourceType: 'blocks',
            isActive: true,
          })
        )
      );
    }

    const offerStatuses = Object.values(OfferStatus);
    const now = new Date();

    for (let i = 0; i < 15; i++) {
      const status = offerStatuses[i % offerStatuses.length];
      const template = savedTemplates[i % savedTemplates.length];
      const client = clients.length > 0 ? clients[i % clients.length] : undefined;
      const offerNumber = `OF/${now.getFullYear()}/${(i + 1).toString().padStart(3, '0')}`;
      const offerDate = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
      const validUntil = new Date(offerDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const items = template.defaultServiceItems ?? [];
      const totalNet = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const vatRate = template.defaultVatRate;
      const totalGross = totalNet * (1 + vatRate / 100);

      const offer = await this.offerRepo.save(
        this.offerRepo.create({
          offerNumber,
          title: `${template.name} - ${client?.name ?? 'Klient'}`,
          description: `Oferta na świadczenie usług według pakietu ${template.name}`,
          status,
          clientId: client?.id,
          templateId: template.id,
          recipientSnapshot: {
            name: client?.name ?? 'Klient Demo',
            nip: client?.nip,
            email: client?.email,
            phone: client?.phone,
          },
          totalNetAmount: totalNet,
          vatRate,
          totalGrossAmount: totalGross,
          serviceTerms: {
            items: items.map((item) => ({ ...item, netAmount: item.unitPrice * item.quantity })),
            paymentTermDays: 14,
            paymentMethod: 'przelew',
          },
          offerDate,
          validUntil,
          companyId: company.id,
          createdById: owner.id,
        })
      );

      await this.offerActivityRepo.save(
        this.offerActivityRepo.create({
          offerId: offer.id,
          activityType: OfferActivityType.CREATED,
          description: 'Oferta została utworzona',
          companyId: company.id,
          performedById: owner.id,
        })
      );

      if (status !== OfferStatus.DRAFT) {
        await this.offerActivityRepo.save(
          this.offerActivityRepo.create({
            offerId: offer.id,
            activityType: OfferActivityType.STATUS_CHANGED,
            description: `Status zmieniony na ${status}`,
            metadata: { previousStatus: OfferStatus.DRAFT, newStatus: status },
            companyId: company.id,
            performedById: owner.id,
          })
        );
      }
    }

    this.logger.log(`Seeded 3 offer templates + 15 offers for ${company.name}`);
  }

  private async seedDocuments(company: Company, owner: User): Promise<void> {
    const templateDefs = [
      {
        name: 'Umowa o świadczenie usług księgowych',
        category: 'contract' as const,
        templateContent:
          'UMOWA O ŚWIADCZENIE USŁUG KSIĘGOWYCH\n\nZawarta dnia {{data}} w {{miasto}}\n\nMiędzy:\n{{biuro}}\na\n{{klient}} (NIP: {{nip}})\n\n§1 Przedmiot umowy\nBiuro zobowiązuje się do świadczenia usług księgowych za wynagrodzeniem {{kwota}} PLN/miesiąc.\n\n§2 Czas obowiązywania\nUmowa zawarta na czas nieokreślony od dnia {{data_rozpoczecia}}.',
        placeholders: ['data', 'miasto', 'biuro', 'klient', 'nip', 'kwota', 'data_rozpoczecia'],
      },
      {
        name: 'Raport miesięczny VAT',
        category: 'report' as const,
        templateContent:
          'RAPORT MIESIĘCZNY VAT\n\nOkres: {{miesiac}} {{rok}}\nKlient: {{klient}} (NIP: {{nip}})\n\nSprzedaż opodatkowana:\n- Stawka 23%: {{vat23}} PLN\n- Stawka 8%: {{vat8}} PLN\n\nVAT odliczony: {{vat_odliczony}} PLN\nVAT do zapłaty: {{vat_do_zaplaty}} PLN\n\nSporządził: {{autor}}\nData: {{data}}',
        placeholders: [
          'miesiac',
          'rok',
          'klient',
          'nip',
          'vat23',
          'vat8',
          'vat_odliczony',
          'vat_do_zaplaty',
          'autor',
          'data',
        ],
      },
      {
        name: 'Faktura za usługi księgowe',
        category: 'invoice' as const,
        templateContent:
          'FAKTURA VAT Nr {{numer}}\n\nData wystawienia: {{data}}\n\nSprzedawca: {{sprzedawca}} NIP: {{nip_sprzedawcy}}\nNabywca: {{nabywca}} NIP: {{nip_nabywcy}}\n\nOpis: {{opis}}\nNetto: {{kwota_netto}} PLN\nVAT {{stawka}}%: {{vat}} PLN\nBrutto: {{kwota_brutto}} PLN\nTermin płatności: {{termin}}',
        placeholders: [
          'numer',
          'data',
          'sprzedawca',
          'nip_sprzedawcy',
          'nabywca',
          'nip_nabywcy',
          'opis',
          'kwota_netto',
          'stawka',
          'vat',
          'kwota_brutto',
          'termin',
        ],
      },
      {
        name: 'Protokół przekazania dokumentów',
        category: 'other' as const,
        templateContent:
          'PROTOKÓŁ PRZEKAZANIA DOKUMENTÓW\n\nData: {{data}}\nMiejscowość: {{miasto}}\n\nPrzekazujący: {{klient}}\nPrzyjmujący: {{biuro}}\n\nWykaz dokumentów:\n{{dokumenty}}\n\nPodpisy: {{klient}} / {{biuro}}',
        placeholders: ['data', 'miasto', 'klient', 'biuro', 'dokumenty'],
      },
      {
        name: 'Oferta usług rachunkowych',
        category: 'offer' as const,
        templateContent:
          'OFERTA USŁUG RACHUNKOWYCH\n\nData: {{data}}\nAdresat: {{adresat}}\n\nSzanowni Państwo,\n\nPrzedstawiamy ofertę na usługi rachunkowo-podatkowe:\n\n{{zakres_uslug}}\n\nCena: {{cena}} PLN netto/miesiąc\nOferta ważna do: {{waznosc}}\n\nZ poważaniem, {{autor}}',
        placeholders: ['data', 'adresat', 'zakres_uslug', 'cena', 'waznosc', 'autor'],
      },
    ];

    const savedTemplates: DocumentTemplate[] = [];
    for (const def of templateDefs) {
      savedTemplates.push(
        await this.docTemplateRepo.save(
          this.docTemplateRepo.create({
            ...def,
            companyId: company.id,
            createdById: owner.id,
            isActive: true,
          })
        )
      );
    }

    for (let i = 0; i < 3; i++) {
      await this.generatedDocRepo.save(
        this.generatedDocRepo.create({
          name: `${savedTemplates[i].name} - ${new Date().toLocaleDateString('pl-PL')}`,
          templateId: savedTemplates[i].id,
          generatedById: owner.id,
          metadata: {
            data: new Date().toLocaleDateString('pl-PL'),
            klient: 'Apex Consulting',
            kwota: '1500',
          },
          sourceModule: 'documents',
          companyId: company.id,
        })
      );
    }

    this.logger.log(`Seeded 5 document templates + 3 generated documents for ${company.name}`);
  }

  private async seedNotifications(company: Company, owner: User, employees: User[]): Promise<void> {
    const recipients = [owner, ...employees];
    const defs = [
      {
        type: NotificationType.TASK_ASSIGNED,
        slug: 'tasks',
        title: 'Przypisano nowe zadanie',
        msg: 'Zostało Ci przypisane: Rozliczenie VAT',
      },
      {
        type: NotificationType.TASK_OVERDUE,
        slug: 'tasks',
        title: 'Zadanie przeterminowane',
        msg: 'Zadanie "Złożenie VAT-7" jest przeterminowane',
      },
      {
        type: NotificationType.TASK_DUE_SOON,
        slug: 'tasks',
        title: 'Zbliża się termin',
        msg: 'Termin zadania "ZUS" upływa za 2 dni',
      },
      {
        type: NotificationType.SETTLEMENT_STATUS_CHANGED,
        slug: 'settlements',
        title: 'Zmiana statusu rozliczenia',
        msg: 'Status rozliczenia zmieniono na "W trakcie"',
      },
      {
        type: NotificationType.SETTLEMENT_ASSIGNED,
        slug: 'settlements',
        title: 'Przypisano rozliczenie',
        msg: 'Przypisano Ci nowe rozliczenie',
      },
      {
        type: NotificationType.OFFER_ACCEPTED,
        slug: 'offers',
        title: 'Oferta zaakceptowana',
        msg: 'Klient zaakceptował ofertę OF/2026/003',
      },
      {
        type: NotificationType.OFFER_EXPIRED,
        slug: 'offers',
        title: 'Oferta wygasła',
        msg: 'Oferta OF/2026/001 wygasła',
      },
      {
        type: NotificationType.LEAD_CREATED,
        slug: 'offers',
        title: 'Nowy lead',
        msg: 'Dodano lead: Firma Transportowa Nowak',
      },
      {
        type: NotificationType.LEAD_CONVERTED,
        slug: 'offers',
        title: 'Lead przekonwertowany',
        msg: 'Lead konwertowany na klienta',
      },
      {
        type: NotificationType.TIME_ENTRY_APPROVED,
        slug: 'time-tracking',
        title: 'Wpis czasu zatwierdzony',
        msg: 'Twój wpis czasu z 01.02.2026 zatwierdzony',
      },
      {
        type: NotificationType.TIME_ENTRY_REJECTED,
        slug: 'time-tracking',
        title: 'Wpis czasu odrzucony',
        msg: 'Wpis wymaga korekty - brak dokumentów',
      },
      {
        type: NotificationType.CLIENT_CREATED,
        slug: 'clients',
        title: 'Nowy klient',
        msg: 'Dodano klienta: Apex Consulting',
      },
      {
        type: NotificationType.CLIENT_SUSPENSION_START_REMINDER_7D,
        slug: 'clients',
        title: 'Zawieszenie za 7 dni',
        msg: 'Klient zawiesza działalność za 7 dni',
      },
      {
        type: NotificationType.SETTLEMENT_DEADLINE_APPROACHING,
        slug: 'settlements',
        title: 'Zbliża się termin rozliczenia',
        msg: 'Termin rozliczenia upływa za 3 dni',
      },
      {
        type: NotificationType.OFFER_SENT,
        slug: 'offers',
        title: 'Oferta wysłana',
        msg: 'Oferta OF/2026/005 wysłana',
      },
      {
        type: NotificationType.TASK_COMPLETED,
        slug: 'tasks',
        title: 'Zadanie ukończone',
        msg: 'Zadanie "JPK_VAT" ukończone',
      },
      {
        type: NotificationType.SETTLEMENT_COMPLETED,
        slug: 'settlements',
        title: 'Rozliczenie ukończone',
        msg: 'Rozliczenie za styczeń zamknięte',
      },
      {
        type: NotificationType.TIME_ENTRY_SUBMITTED,
        slug: 'time-tracking',
        title: 'Wpis przesłany do zatwierdzenia',
        msg: 'Pracownik przesłał wpis czasu',
      },
      {
        type: NotificationType.CLIENT_RELIEF_END_REMINDER_7D,
        slug: 'clients',
        title: 'Ulga ZUS kończy się za 7 dni',
        msg: 'Ulga na start klienta kończy się za 7 dni',
      },
      {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        slug: 'system',
        title: 'Aktualizacja systemu',
        msg: 'Wersja 2.1.0 jest dostępna',
      },
    ];

    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const def = defs[i];
      const recipient = recipients[i % recipients.length];
      const isRead = i >= 12;
      const isArchived = i >= 16;
      await this.notificationRepo.save(
        this.notificationRepo.create({
          recipientId: recipient.id,
          companyId: company.id,
          type: def.type,
          moduleSlug: def.slug,
          title: def.title,
          message: def.msg,
          data: null,
          actionUrl: null,
          isRead,
          readAt: isRead ? new Date(now.getTime() - i * 60 * 60 * 1000) : null,
          isArchived,
          archivedAt: isArchived ? new Date(now.getTime() - i * 30 * 60 * 1000) : null,
          emailSent: false,
          actorId: i % 3 === 0 ? owner.id : null,
          isBatch: false,
          itemCount: 1,
        })
      );
    }

    this.logger.log(`Seeded 20 notifications for ${company.name}`);
  }

  private async seedEmailAutoReply(company: Company): Promise<void> {
    const templates = [
      {
        name: 'Odpowiedź CEIDG - Rejestracja działalności',
        category: 'CEIDG',
        triggerKeywords: ['CEIDG', 'rejestracja działalności', 'zakładam firmę', 'NIP', 'REGON'],
        bodyTemplate:
          'Dziękujemy za wiadomość dotyczącą rejestracji działalności. Oferujemy pomoc w procesie: wypełnienie CEIDG-1, założenie konta VAT, rejestracja ZUS. Proszę o kontakt telefoniczny w celu umówienia wizyty.',
        tone: 'formal' as const,
      },
      {
        name: 'Odpowiedź VAT - Pytania o rozliczenia',
        category: 'VAT',
        triggerKeywords: ['VAT', 'podatek VAT', 'deklaracja VAT', 'JPK_VAT', 'faktura VAT'],
        bodyTemplate:
          'W odpowiedzi na zapytanie dotyczące VAT: oferujemy przygotowanie deklaracji VAT-7/VAT-7K, ewidencję VAT, rejestrację jako podatnik VAT. W razie pytań prosimy o kontakt.',
        tone: 'formal' as const,
      },
      {
        name: 'Odpowiedź ogólna - Oferta usług',
        category: 'Ogólne',
        triggerKeywords: [
          'oferta',
          'cennik',
          'usługi księgowe',
          'biuro rachunkowe',
          'ile kosztuje',
        ],
        bodyTemplate:
          'Dziękujemy za zainteresowanie naszymi usługami. Oferujemy: prowadzenie KPiR i pełnej księgowości, rozliczenia podatkowe, obsługę kadrowo-płacową. Prosimy o kontakt w celu bezpłatnej konsultacji.',
        tone: 'neutral' as const,
      },
    ];

    for (const t of templates) {
      await this.emailAutoReplyRepo.save(
        this.emailAutoReplyRepo.create({
          companyId: company.id,
          name: t.name,
          category: t.category,
          isActive: true,
          triggerKeywords: t.triggerKeywords,
          keywordMatchMode: 'any',
          matchSubjectOnly: false,
          bodyTemplate: t.bodyTemplate,
          tone: t.tone,
        })
      );
    }

    this.logger.log(`Seeded 3 email auto-reply templates for ${company.name}`);
  }

  private async seedAIData(company: Company, owner: User): Promise<void> {
    await this.aiConfigRepo.save(
      this.aiConfigRepo.create({
        companyId: company.id,
        provider: AIProvider.OPENAI,
        model: 'gpt-4',
        systemPrompt:
          'Jesteś asystentem biura rachunkowego. Pomagasz w kwestiach podatkowych, księgowych i prawnych dla polskich przedsiębiorców.',
        apiKey: null,
        temperature: 0.7,
        maxTokens: 4000,
        enableStreaming: false,
        createdById: owner.id,
      })
    );

    const conv1 = await this.aiConversationRepo.save(
      this.aiConversationRepo.create({
        title: 'Optymalizacja podatkowa dla DG',
        companyId: company.id,
        createdById: owner.id,
        totalTokens: 1240,
        messageCount: 4,
      })
    );

    const msgs1 = [
      {
        role: AIMessageRole.USER,
        content: 'Jakie są możliwości optymalizacji podatkowej dla jednoosobowej działalności?',
        inp: 25,
        out: 0,
      },
      {
        role: AIMessageRole.ASSISTANT,
        content:
          'Kluczowe strategie: 1) Wybór formy opodatkowania (19% liniowy vs skala), 2) Koszty uzyskania przychodu, 3) Ulga na start/Mały ZUS, 4) Amortyzacja środków trwałych, 5) Leasing vs zakup.',
        inp: 0,
        out: 285,
      },
      {
        role: AIMessageRole.USER,
        content: 'Przy przychodach 200k PLN lepszy jest podatek liniowy czy skala?',
        inp: 22,
        out: 0,
      },
      {
        role: AIMessageRole.ASSISTANT,
        content:
          'Przy 200k przychodu i kosztach 80k (dochód 120k): skala ~17.6k podatku, liniowy ~22.8k. Skala daje kwotę wolną 30k i ulgi. Rekomendacja: kalkulacja indywidualna z uwzględnieniem ulg rodzinnych.',
        inp: 20,
        out: 210,
      },
    ];
    for (const m of msgs1) {
      await this.aiMessageRepo.save(
        this.aiMessageRepo.create({
          conversationId: conv1.id,
          role: m.role,
          content: m.content,
          inputTokens: m.inp,
          outputTokens: m.out,
          totalTokens: m.inp + m.out,
          userId: m.role === AIMessageRole.USER ? owner.id : null,
          contextUsed: null,
        })
      );
    }

    const conv2 = await this.aiConversationRepo.save(
      this.aiConversationRepo.create({
        title: 'VAT w transakcjach wewnątrzunijnych',
        companyId: company.id,
        createdById: owner.id,
        totalTokens: 980,
        messageCount: 4,
      })
    );

    const msgs2 = [
      {
        role: AIMessageRole.USER,
        content: 'Jak rozliczyć VAT przy zakupie usługi od firmy z Niemiec?',
        inp: 20,
        out: 0,
      },
      {
        role: AIMessageRole.ASSISTANT,
        content:
          'Import usług z UE podlega odwrotnemu obciążeniu (reverse charge). Polska firma: 1) wystawia fakturę wewnętrzną, 2) wykazuje VAT należny 23% w JPK_VAT, 3) odlicza VAT naliczony. Zagraniczny dostawca wystawia ze stawką 0%.',
        inp: 0,
        out: 280,
      },
      {
        role: AIMessageRole.USER,
        content: 'Czy potrzebuję rejestracji VIES do transakcji UE?',
        inp: 10,
        out: 0,
      },
      {
        role: AIMessageRole.ASSISTANT,
        content:
          'Tak - do transakcji wewnątrzunijnych wymagana jest rejestracja VIES. Rejestracja przez VAT-R zaznaczając transakcje wewnątrzunijne. Numer VIES = NIP z prefiksem PL. Jest to warunek zastosowania 0% przez dostawcę z UE.',
        inp: 0,
        out: 195,
      },
    ];
    for (const m of msgs2) {
      await this.aiMessageRepo.save(
        this.aiMessageRepo.create({
          conversationId: conv2.id,
          role: m.role,
          content: m.content,
          inputTokens: m.inp,
          outputTokens: m.out,
          totalTokens: m.inp + m.out,
          userId: m.role === AIMessageRole.USER ? owner.id : null,
          contextUsed: null,
        })
      );
    }

    const today = new Date();
    for (let d = 0; d < 5; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      await this.tokenUsageRepo.save(
        this.tokenUsageRepo.create({
          companyId: company.id,
          userId: owner.id,
          date,
          totalInputTokens: 200 + d * 50,
          totalOutputTokens: 600 + d * 100,
          totalTokens: 800 + d * 150,
          conversationCount: d + 1,
          messageCount: (d + 1) * 4,
        })
      );
    }

    this.logger.log(`Seeded AI config + 2 conversations + 5 token usages for ${company.name}`);
  }
}
