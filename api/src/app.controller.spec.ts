import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('deve retornar status ok', () => {
    const controller = new AppController(new AppService());
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
