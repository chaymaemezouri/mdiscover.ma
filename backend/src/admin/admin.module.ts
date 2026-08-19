import { Module } from '@nestjs/common';
import { SlugService } from '../common/utils/slug.service';
import { AdminController, SeoController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminExportService } from './admin-export.service';
import { AdminImportService } from './admin-import.service';
import { AdminSettingsService } from './admin-settings.service';
import { AdminStatsService } from './admin-stats.service';
import { SeoService } from './seo.service';

@Module({
  controllers: [AdminController, SeoController],
  providers: [
    SlugService,
    AdminDashboardService,
    AdminStatsService,
    AdminExportService,
    AdminImportService,
    AdminSettingsService,
    SeoService,
  ],
})
export class AdminModule {}
