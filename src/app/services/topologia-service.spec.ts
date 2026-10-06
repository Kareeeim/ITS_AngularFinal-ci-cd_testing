import { TestBed } from '@angular/core/testing';
import { TopologiaService } from './topologia-service';

describe('TopologiaService', () => {
  let service: TopologiaService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(TopologiaService);
  });

  it('dovrebbe essere creato', () => {
    expect(service).toBeTruthy();
  });

  it('dovrebbe aggiungere dispositivi con identificativi progressivi', () => {
    let primo = service.aggiungiDispositivo('PC', 100, 100);
    let secondo = service.aggiungiDispositivo('Router', 300, 100);

    expect(service.dispositivi().length).toBe(2);
    expect(primo.id).toBe(1);
    expect(secondo.id).toBe(2);
    expect(primo.nome).toBe('PC-01');
    expect(secondo.nome).toBe('Router-01');
  });

  it('dovrebbe aggiornare le coordinate quando un dispositivo viene spostato', () => {
    let dispositivo = service.aggiungiDispositivo('Switch', 100, 100);

    service.spostaDispositivo(dispositivo.id ?? 0, 250, 320);

    expect(service.cercaDispositivo(dispositivo.id ?? 0)?.x).toBe(250);
    expect(service.cercaDispositivo(dispositivo.id ?? 0)?.y).toBe(320);
  });

  it('non dovrebbe collegare un dispositivo a sé stesso', () => {
    let dispositivo = service.aggiungiDispositivo('PC', 100, 100);

    expect(service.aggiungiConnessione(dispositivo.id ?? 0, dispositivo.id ?? 0)).toBe(false);
    expect(service.connessioni().length).toBe(0);
  });

  it('non dovrebbe creare connessioni duplicate, nemmeno invertite', () => {
    let primo = service.aggiungiDispositivo('PC', 100, 100);
    let secondo = service.aggiungiDispositivo('Switch', 300, 100);

    expect(service.aggiungiConnessione(primo.id ?? 0, secondo.id ?? 0)).toBe(true);
    expect(service.aggiungiConnessione(primo.id ?? 0, secondo.id ?? 0)).toBe(false);
    expect(service.aggiungiConnessione(secondo.id ?? 0, primo.id ?? 0)).toBe(false);
    expect(service.connessioni().length).toBe(1);
  });

  it('dovrebbe eliminare le connessioni collegate a un dispositivo eliminato', () => {
    let primo = service.aggiungiDispositivo('PC', 100, 100);
    let secondo = service.aggiungiDispositivo('Switch', 300, 100);

    service.aggiungiConnessione(primo.id ?? 0, secondo.id ?? 0);
    service.eliminaDispositivo(secondo.id ?? 0);

    expect(service.dispositivi().length).toBe(1);
    expect(service.connessioni().length).toBe(0);
  });

  it('dovrebbe salvare e ricaricare la topologia dal Local Storage', () => {
    let dispositivo = service.aggiungiDispositivo('Router', 400, 200);
    service.aggiungiDispositivo('PC', 150, 400);
    service.aggiungiConnessione(dispositivo.id ?? 0, 2);
    service.salvaTopologia();

    service.svuotaCanvas();
    expect(service.dispositivi().length).toBe(0);

    expect(service.caricaTopologia()).toBe(true);
    expect(service.dispositivi().length).toBe(2);
    expect(service.connessioni().length).toBe(1);
    expect(service.dispositivi()[0].x).toBe(400);
  });

  it('dovrebbe esportare e importare la topologia in JSON', () => {
    service.aggiungiDispositivo('PC', 100, 100);
    service.aggiungiDispositivo('Switch', 300, 100);

    let json = service.esportaJson();

    service.svuotaCanvas();
    expect(service.dispositivi().length).toBe(0);

    expect(service.importaJson(json)).toBe(true);
    expect(service.dispositivi().length).toBe(2);
  });

  it('dovrebbe rifiutare un JSON non valido', () => {
    expect(service.importaJson('{ "dispositivi": "non è un elenco" }')).toBe(false);
    expect(service.importaJson('testo non json')).toBe(false);
  });
});
