import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import {
  CurrentUser,
  Public,
  Roles,
} from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/decorators/auth.decorators';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminExportService } from './admin-export.service';
import { AdminImportService } from './admin-import.service';
import { AdminSettingsService } from './admin-settings.service';
import { AdminStatsService } from './admin-stats.service';
import {
  AuditQueryDto,
  DateRangeQueryDto,
  ImportProductsCsvDto,
  UpsertSettingDto,
  UpsertSettingsBulkDto,
} from './dto/admin.dto';
import { SeoService } from './seo.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly stats: AdminStatsService,
    private readonly exporter: AdminExportService,
    private readonly importer: AdminImportService,
    private readonly settings: AdminSettingsService,
  ) {}

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('dashboard')
  getDashboard() {
    return this.dashboard.getDashboard();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('overview')
  getOverview() {
    return this.dashboard.getOverview();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('stats/sales')
  salesStats(@Query() query: DateRangeQueryDto) {
    return this.stats.sales(query.from, query.to);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('stats/top-products')
  topProducts(@Query() query: DateRangeQueryDto) {
    return this.stats.topProducts(query.from, query.to);
  }

  @Roles(Role.ADMIN)
  @Get('export/orders')
  async exportOrders(
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.exporter.ordersCsv(query.from, query.to);
    this.sendCsv(res, 'orders.csv', csv);
  }

  @Roles(Role.ADMIN)
  @Get('export/products')
  async exportProducts(@Res() res: Response) {
    const csv = await this.exporter.productsCsv();
    this.sendCsv(res, 'products.csv', csv);
  }

  @Roles(Role.ADMIN)
  @Get('export/customers')
  async exportCustomers(@Res() res: Response) {
    const csv = await this.exporter.customersCsv();
    this.sendCsv(res, 'customers.csv', csv);
  }

  @Roles(Role.ADMIN)
  @Get('export/sales-report')
  async exportSalesReport(
    @Query() query: DateRangeQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.exporter.salesReportCsv(query.from, query.to);
    this.sendCsv(res, 'sales-report.csv', csv);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Post('import/products')
  importProducts(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportProductsCsvDto,
  ) {
    return this.importer.importProducts(
      dto.csv,
      user.id,
      dto.dryRun ?? false,
    );
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Put('settings/bulk')
  upsertSettingsBulk(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertSettingsBulkDto,
  ) {
    return this.settings.upsertMany(user.id, dto.items);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('settings')
  listSettings() {
    return this.settings.list();
  }

  @Public()
  @Get('settings/public')
  publicSettings() {
    return this.settings.publicContact();
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('settings/:key')
  getSetting(@Param('key') key: string) {
    return this.settings.get(key);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Put('settings')
  upsertSetting(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertSettingDto,
  ) {
    return this.settings.upsert(user.id, dto.key, dto.value);
  }

  @Roles(Role.ADMIN, Role.DEVELOPER)
  @Get('audit-logs')
  listAudit(@Query() query: AuditQueryDto) {
    return this.settings.listAudit(query);
  }

  private sendCsv(res: Response, filename: string, csv: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(csv);
  }
}

@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async sitemap() {
    return this.seo.buildSitemapXml();
  }

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() {
    return this.seo.buildRobotsTxt();
  }
}
