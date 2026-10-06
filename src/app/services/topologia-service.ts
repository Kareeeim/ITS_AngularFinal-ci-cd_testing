import { Injectable, signal } from '@angular/core';
import { Connessione } from '../models/connessione';
import { Dispositivo, StatoDispositivo, TipoDispositivo } from '../models/dispositivo';

/** Modalità di interazione attiva sul canvas. */
export type ModalitaCanvas = 'edit' | 'connect';

/** Chiave usata per salvare la topologia nel Local Storage del browser. */
const CHIAVE_TOPOLOGIA = 'topologia-rete';

/** Durata in millisecondi dei messaggi mostrati all'utente. */
const DURATA_MESSAGGIO = 4000;

/** Distanza minima tra due dispositivi prima di considerarli sovrapposti. */
const DISTANZA_MINIMA = 60;

@Injectable({
  providedIn: 'root',
})
export class TopologiaService {
  // Stato della topologia
  dispositivi = signal<Dispositivo[]>([]);
  connessioni = signal<Connessione[]>([]);

  // Stato dell'interazione
  modalita = signal<ModalitaCanvas>('edit');
  idSelezionato = signal<number | null>(null);
  idDettaglio = signal<number | null>(null);

  // Stato di vista del canvas
  zoom = signal(1);
  panX = signal(0);
  panY = signal(0);

  // Comunicazione con l'utente
  messaggio = signal('');
  esisteSalvataggio = signal(false);
  richiestaConferma = signal<string | null>(null);

  private timerMessaggio?: ReturnType<typeof setTimeout>;
  private rispostaConferma?: (varEsito: boolean) => void;

  constructor() {
    // Ripristino automatico della topologia salvata
    let topologiaString = localStorage.getItem(CHIAVE_TOPOLOGIA);
    this.esisteSalvataggio.set(topologiaString !== null);

    if (topologiaString) {
      this.applicaTopologia(topologiaString);
    }
  }

  // ---------------------------------------------------------------------------
  // Dispositivi
  // ---------------------------------------------------------------------------

  aggiungiDispositivo(varTipo: TipoDispositivo, varX: number, varY: number): Dispositivo {
    let posizione = this.posizioneLibera(varX, varY);

    let dispositivoCreato = new Dispositivo(
      this.prossimoIdDispositivo(),
      varTipo,
      this.prossimoNome(varTipo),
      posizione.x,
      posizione.y,
      this.prossimoIp(),
    );

    this.dispositivi.update((elenco) => [...elenco, dispositivoCreato]);
    this.mostraMessaggio('Dispositivo ' + dispositivoCreato.nome + ' aggiunto al canvas');

    return dispositivoCreato;
  }

  /** Aggiunge un dispositivo in una posizione libera dell'area attualmente visibile. */
  aggiungiDispositivoInVista(varTipo: TipoDispositivo): Dispositivo {
    let zoom = this.zoom();
    let scarto = (this.dispositivi().length % 4) * 40;

    let x = -this.panX() / zoom + 90 + scarto;
    let y = -this.panY() / zoom + 70 + scarto;

    return this.aggiungiDispositivo(varTipo, x, y);
  }

  spostaDispositivo(varId: number, varX: number, varY: number): boolean {
    if (!this.cercaDispositivo(varId)) {
      return false;
    }

    this.dispositivi.update((elenco) =>
      elenco.map((dispositivo) =>
        dispositivo.id === varId
          ? dispositivo.copia({ x: Math.round(varX), y: Math.round(varY) })
          : dispositivo,
      ),
    );

    return true;
  }

  rinominaDispositivo(varId: number, varNome: string): boolean {
    return this.aggiornaCampi(varId, { nome: varNome });
  }

  aggiornaIp(varId: number, varIp: string): boolean {
    return this.aggiornaCampi(varId, { ip: varIp });
  }

  aggiornaHostname(varId: number, varHostname: string): boolean {
    return this.aggiornaCampi(varId, { hostname: varHostname });
  }

  aggiornaStato(varId: number, varStato: StatoDispositivo): boolean {
    return this.aggiornaCampi(varId, { stato: varStato });
  }

  eliminaDispositivo(varId: number): boolean {
    let dispositivo = this.cercaDispositivo(varId);

    if (!dispositivo) {
      return false;
    }

    this.dispositivi.update((elenco) => elenco.filter((elemento) => elemento.id !== varId));

    // Le connessioni che coinvolgono il dispositivo non hanno più senso
    this.connessioni.update((elenco) =>
      elenco.filter(
        (connessione) => connessione.sourceId !== varId && connessione.targetId !== varId,
      ),
    );

    if (this.idSelezionato() === varId) {
      this.idSelezionato.set(null);
    }
    if (this.idDettaglio() === varId) {
      this.idDettaglio.set(null);
    }

    this.mostraMessaggio('Dispositivo ' + dispositivo.nome + ' eliminato');
    return true;
  }

  cercaDispositivo(varId: number): Dispositivo | null {
    for (let dispositivo of this.dispositivi()) {
      if (dispositivo.id === varId) {
        return dispositivo;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Connessioni
  // ---------------------------------------------------------------------------

  aggiungiConnessione(varSourceId: number, varTargetId: number): boolean {
    if (varSourceId === varTargetId) {
      this.mostraMessaggio('Un dispositivo non può essere collegato a sé stesso');
      return false;
    }

    for (let connessione of this.connessioni()) {
      let collegamentoDiretto =
        connessione.sourceId === varSourceId && connessione.targetId === varTargetId;
      let collegamentoInverso =
        connessione.sourceId === varTargetId && connessione.targetId === varSourceId;

      if (collegamentoDiretto || collegamentoInverso) {
        this.mostraMessaggio('I due dispositivi sono già collegati');
        return false;
      }
    }

    let connessioneCreata = new Connessione(this.prossimoIdConnessione(), varSourceId, varTargetId);

    this.connessioni.update((elenco) => [...elenco, connessioneCreata]);
    this.mostraMessaggio('Connessione creata');

    return true;
  }

  eliminaConnessione(varId: number): boolean {
    let connessione = this.cercaConnessione(varId);

    if (!connessione) {
      return false;
    }

    this.connessioni.update((elenco) => elenco.filter((elemento) => elemento.id !== varId));

    this.mostraMessaggio('Connessione eliminata');
    return true;
  }

  cercaConnessione(varId: number): Connessione | null {
    for (let connessione of this.connessioni()) {
      if (connessione.id === varId) {
        return connessione;
      }
    }

    return null;
  }

  connessioniDispositivo(varId: number): Connessione[] {
    let risultato: Connessione[] = [];

    for (let connessione of this.connessioni()) {
      if (connessione.sourceId === varId || connessione.targetId === varId) {
        risultato.push(connessione);
      }
    }

    return risultato;
  }

  /** Restituisce l'identificativo del dispositivo posto all'altro capo della connessione. */
  altroCapo(varConnessione: Connessione, varId: number): number | null {
    if (varConnessione.sourceId === varId) {
      return varConnessione.targetId ?? null;
    }
    if (varConnessione.targetId === varId) {
      return varConnessione.sourceId ?? null;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Modalità e vista
  // ---------------------------------------------------------------------------

  impostaModalita(varModalita: ModalitaCanvas): void {
    this.modalita.set(varModalita);
    this.idSelezionato.set(null);

    if (varModalita === 'connect') {
      this.mostraMessaggio('Modalità Connect: clicca il dispositivo di origine');
    } else {
      this.mostraMessaggio('Modalità Edit: trascina i dispositivi per spostarli');
    }
  }

  impostaZoom(varZoom: number): void {
    this.zoom.set(Math.min(2.5, Math.max(0.3, varZoom)));
  }

  zoomAvanti(): void {
    this.impostaZoom(this.zoom() + 0.1);
  }

  zoomIndietro(): void {
    this.impostaZoom(this.zoom() - 0.1);
  }

  reimpostaVista(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
    this.mostraMessaggio('Vista del canvas reimpostata');
  }

  // ---------------------------------------------------------------------------
  // Persistenza su Local Storage
  // ---------------------------------------------------------------------------

  salvaTopologia(): boolean {
    let topologia = {
      dispositivi: this.dispositivi(),
      connessioni: this.connessioni(),
    };

    localStorage.setItem(CHIAVE_TOPOLOGIA, JSON.stringify(topologia));
    this.esisteSalvataggio.set(true);
    this.mostraMessaggio('Topologia salvata nel Local Storage');

    return true;
  }

  caricaTopologia(): boolean {
    let topologiaString = localStorage.getItem(CHIAVE_TOPOLOGIA);

    if (!topologiaString) {
      this.mostraMessaggio('Nessuna topologia salvata nel Local Storage');
      return false;
    }

    if (!this.applicaTopologia(topologiaString)) {
      this.mostraMessaggio('La topologia salvata non è valida');
      return false;
    }

    this.mostraMessaggio('Topologia caricata dal Local Storage');
    return true;
  }

  cancellaTopologia(): boolean {
    localStorage.removeItem(CHIAVE_TOPOLOGIA);
    this.esisteSalvataggio.set(false);
    this.svuotaCanvas();

    this.mostraMessaggio('Topologia cancellata dal Local Storage');
    return true;
  }

  svuotaCanvas(): void {
    this.dispositivi.set([]);
    this.connessioni.set([]);
    this.idSelezionato.set(null);
    this.idDettaglio.set(null);
  }

  // ---------------------------------------------------------------------------
  // Esportazione e importazione JSON
  // ---------------------------------------------------------------------------

  esportaJson(): string {
    let topologia = {
      dispositivi: this.dispositivi(),
      connessioni: this.connessioni(),
    };

    return JSON.stringify(topologia, null, 2);
  }

  importaJson(varJson: string): boolean {
    if (!this.applicaTopologia(varJson)) {
      this.mostraMessaggio('File JSON non valido: importazione annullata');
      return false;
    }

    this.mostraMessaggio('Topologia importata dal file JSON');
    return true;
  }

  // ---------------------------------------------------------------------------
  // Messaggi
  // ---------------------------------------------------------------------------

  mostraMessaggio(varTesto: string): void {
    this.messaggio.set(varTesto);

    clearTimeout(this.timerMessaggio);
    this.timerMessaggio = setTimeout(() => this.messaggio.set(''), DURATA_MESSAGGIO);
  }

  // ---------------------------------------------------------------------------
  // Conferme
  // ---------------------------------------------------------------------------

  /**
   * Mostra una richiesta di conferma in stile Cyberpunk al posto della finestra
   * nativa del browser. Restituisce una promessa risolta con la scelta fatta.
   */
  conferma(varDomanda: string): Promise<boolean> {
    this.richiestaConferma.set(varDomanda);

    return new Promise((varRisolvi) => {
      this.rispostaConferma = varRisolvi;
    });
  }

  /** Chiude la richiesta di conferma aperta e comunica la scelta dell'utente. */
  rispondiConferma(varEsito: boolean): void {
    this.richiestaConferma.set(null);

    this.rispostaConferma?.(varEsito);
    this.rispostaConferma = undefined;
  }

  // ---------------------------------------------------------------------------
  // Metodi interni
  // ---------------------------------------------------------------------------

  /**
   * Legge una topologia serializzata e la riporta nello stato dell'applicazione.
   * Gli oggetti letti dal JSON vengono ricostruiti come istanze delle classi
   * Dispositivo e Connessione.
   */
  private applicaTopologia(varTopologiaString: string): boolean {
    try {
      let topologia = JSON.parse(varTopologiaString);

      if (!Array.isArray(topologia.dispositivi) || !Array.isArray(topologia.connessioni)) {
        return false;
      }

      this.dispositivi.set(
        topologia.dispositivi.map(
          (dispositivo: Dispositivo) =>
            new Dispositivo(
              dispositivo.id,
              dispositivo.tipo,
              dispositivo.nome,
              dispositivo.x,
              dispositivo.y,
              dispositivo.ip,
              dispositivo.hostname,
              dispositivo.stato,
            ),
        ),
      );

      this.connessioni.set(
        topologia.connessioni.map(
          (connessione: Connessione) =>
            new Connessione(connessione.id, connessione.sourceId, connessione.targetId),
        ),
      );

      this.idSelezionato.set(null);
      this.idDettaglio.set(null);

      return true;
    } catch {
      return false;
    }
  }

  private aggiornaCampi(varId: number, varModifiche: Partial<Dispositivo>): boolean {
    if (!this.cercaDispositivo(varId)) {
      return false;
    }

    this.dispositivi.update((elenco) =>
      elenco.map((dispositivo) =>
        dispositivo.id === varId ? dispositivo.copia(varModifiche) : dispositivo,
      ),
    );

    return true;
  }

  private prossimoIdDispositivo(): number {
    let massimo = 0;

    for (let dispositivo of this.dispositivi()) {
      if ((dispositivo.id ?? 0) > massimo) {
        massimo = dispositivo.id ?? 0;
      }
    }

    return massimo + 1;
  }

  private prossimoIdConnessione(): number {
    let massimo = 0;

    for (let connessione of this.connessioni()) {
      if ((connessione.id ?? 0) > massimo) {
        massimo = connessione.id ?? 0;
      }
    }

    return massimo + 1;
  }

  private prossimoNome(varTipo: TipoDispositivo): string {
    let conteggio = 0;

    for (let dispositivo of this.dispositivi()) {
      if (dispositivo.tipo === varTipo) {
        conteggio++;
      }
    }

    return varTipo + '-' + String(conteggio + 1).padStart(2, '0');
  }

  private prossimoIp(): string {
    let massimo = 0;

    for (let dispositivo of this.dispositivi()) {
      let parti = (dispositivo.ip ?? '').split('.');

      if (parti.length === 4) {
        let ultimo = parseInt(parti[3]);

        if (!isNaN(ultimo) && ultimo > massimo) {
          massimo = ultimo;
        }
      }
    }

    return '192.168.1.' + (massimo + 1);
  }

  /** Cerca una posizione libera, spostando il punto di partenza a cascata. */
  private posizioneLibera(varX: number, varY: number): { x: number; y: number } {
    let x = Math.round(varX);
    let y = Math.round(varY);
    let tentativi = 0;

    while (tentativi < 40 && this.posizioneOccupata(x, y)) {
      x += 40;
      y += 40;
      tentativi++;
    }

    return { x: x, y: y };
  }

  private posizioneOccupata(varX: number, varY: number): boolean {
    for (let dispositivo of this.dispositivi()) {
      let distanzaX = Math.abs((dispositivo.x ?? 0) - varX);
      let distanzaY = Math.abs((dispositivo.y ?? 0) - varY);

      if (distanzaX < DISTANZA_MINIMA && distanzaY < DISTANZA_MINIMA) {
        return true;
      }
    }

    return false;
  }
}
