import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Mdiscover Impex Food API',
      universe: 'food-hygiene',
      version: '0.1.0',
      docs: 'Étape 1 — setup infrastructure',
    };
  }
}
