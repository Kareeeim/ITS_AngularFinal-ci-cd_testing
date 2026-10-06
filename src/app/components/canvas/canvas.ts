import { Component, computed, inject } from '@angular/core';
import {
  ALTEZZA_DISPOSITIVO,
  Dispositivo,
  LARGHEZZA_DISPOSITIVO,
  TipoDispositivo,
} from '../../models/dispositivo';
import { TopologiaService } from '../../services/topologia-service';
import { BarraStrumenti } from '../barra-strumenti/barra-strumenti';
import { Dettaglio } from '../dettaglio/dettaglio';
import { IconaDispositivo } from '../icona-dispositivo/icona-dispositivo';

/** Segmento disegnato sull'SVG per rappresentare una connessione. */
type LineaCollegamento = {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** Passo della griglia di sfondo del canvas, in pixel. */
const PASSO_GRIGLIA = 40;

/** Spostamento minimo, in pixel, oltre il quale un click diventa un trascinamento. */
const SOGLIA_TRASCINAMENTO = 4;

@Component({
  selector: 'app-canvas',
  imports: [IconaDispositivo, Dettaglio, BarraStrumenti],
  templateUrl: './canvas.html',
  styleUrl: './canvas.css',
})
export class Canvas {
  protected readonly service = inject(TopologiaService);

  /** Dimensioni del sistema di coordinate del canvas. */
  protected readonly larghezzaMondo = 4000;
  protected readonly altezzaMondo = 3000;

  /** Vero quando l'ultimo gesto sul dispositivo è stato un trascinamento. */
  private spostato = false;

  /** Segmenti da disegnare: si ricalcolano a ogni spostamento dei dispositivi. */
  protected readonly linee = computed<LineaCollegamento[]>(() => {
    let dispositivi = this.service.dispositivi();
    let risultato: LineaCollegamento[] = [];

    for (let connessione of this.service.connessioni()) {
      let sorgente = this.trovaDispositivo(dispositivi, connessione.sourceId);
      let destinazione = this.trovaDispositivo(dispositivi, connessione.targetId);

      if (!sorgente || !destinazione) {
        continue;
      }

      risultato.push({
        id: connessione.id ?? 0,
        x1: (sorgente.x ?? 0) + LARGHEZZA_DISPOSITIVO / 2,
        y1: (sorgente.y ?? 0) + ALTEZZA_DISPOSITIVO / 2,
        x2: (destinazione.x ?? 0) + LARGHEZZA_DISPOSITIVO / 2,
        y2: (destinazione.y ?? 0) + ALTEZZA_DISPOSITIVO / 2,
      });
    }

    return risultato;
  });

  protected readonly trasformazioneMondo = computed(
    () =>
      'translate(' +
      this.service.panX() +
      'px, ' +
      this.service.panY() +
      'px) scale(' +
      this.service.zoom() +
      ')',
  );

  /**
   * La griglia di sfondo segue pan e zoom, come se fosse disegnata sul canvas.
   * Il foglio di stile disegna quattro livelli (due fitti e due larghi), quindi
   * misure e posizioni vengono ripetute per ciascun livello.
   */
  protected readonly dimensioneGriglia = computed(() => {
    let lato = PASSO_GRIGLIA * this.service.zoom();
    let fitta = lato + 'px ' + lato + 'px';
    let larga = lato * 5 + 'px ' + lato * 5 + 'px';

    return fitta + ', ' + fitta + ', ' + larga + ', ' + larga;
  });

  protected readonly posizioneGriglia = computed(() => {
    let punto = this.service.panX() + 'px ' + this.service.panY() + 'px';

    return punto + ', ' + punto + ', ' + punto + ', ' + punto;
  });

  protected readonly suggerimento = computed(() => {
    if (this.service.modalita() === 'connect') {
      let origine = this.service.idSelezionato();

      if (origine === null) {
        return 'Modalità Connect: clicca il dispositivo di origine';
      }

      let dispositivo = this.service.cercaDispositivo(origine);
      return 'Origine: ' + dispositivo?.nome + ' — clicca ora il dispositivo di destinazione';
    }

    return 'Modalità Edit: trascina i dispositivi per spostarli, click destro per i dettagli';
  });

  // ---------------------------------------------------------------------------
  // Trascinamento dei dispositivi
  // ---------------------------------------------------------------------------

  protected iniziaTrascinamento(varEvento: PointerEvent, varDispositivo: Dispositivo): void {
    varEvento.stopPropagation();

    if (varEvento.button !== 0 || this.service.modalita() !== 'edit') {
      return;
    }

    varEvento.preventDefault();

    this.spostato = false;

    let partenzaX = varEvento.clientX;
    let partenzaY = varEvento.clientY;
    let origineX = varDispositivo.x ?? 0;
    let origineY = varDispositivo.y ?? 0;
    let zoom = this.service.zoom();

    let sposta = (varMovimento: PointerEvent) => {
      let deltaX = varMovimento.clientX - partenzaX;
      let deltaY = varMovimento.clientY - partenzaY;

      if (Math.abs(deltaX) > SOGLIA_TRASCINAMENTO || Math.abs(deltaY) > SOGLIA_TRASCINAMENTO) {
        this.spostato = true;
      }

      // Le coordinate del canvas si ottengono dividendo per lo zoom applicato
      this.service.spostaDispositivo(
        varDispositivo.id ?? 0,
        origineX + deltaX / zoom,
        origineY + deltaY / zoom,
      );
    };

    let termina = () => {
      window.removeEventListener('pointermove', sposta);
      window.removeEventListener('pointerup', termina);
    };

    window.addEventListener('pointermove', sposta);
    window.addEventListener('pointerup', termina);
  }

  // ---------------------------------------------------------------------------
  // Selezione e connessione
  // ---------------------------------------------------------------------------

  protected selezionaDispositivo(varEvento: MouseEvent, varDispositivo: Dispositivo): void {
    varEvento.stopPropagation();

    // Se il click conclude un trascinamento non è una selezione
    if (this.spostato) {
      this.spostato = false;
      return;
    }

    let id = varDispositivo.id ?? null;

    if (this.service.modalita() !== 'connect') {
      this.service.idSelezionato.set(id);
      return;
    }

    let origine = this.service.idSelezionato();

    if (origine === null) {
      this.service.idSelezionato.set(id);
      this.service.mostraMessaggio(
        'Origine: ' + varDispositivo.nome + ' — clicca il dispositivo di destinazione',
      );
      return;
    }

    if (origine === id) {
      this.service.idSelezionato.set(null);
      this.service.mostraMessaggio('Selezione annullata');
      return;
    }

    if (id !== null && this.service.aggiungiConnessione(origine, id)) {
      this.service.idSelezionato.set(null);
    }
  }

  protected apriDettaglio(varEvento: MouseEvent, varDispositivo: Dispositivo): void {
    varEvento.preventDefault();
    varEvento.stopPropagation();

    this.service.idSelezionato.set(varDispositivo.id ?? null);
    this.service.idDettaglio.set(varDispositivo.id ?? null);
  }

  protected async eliminaConnessione(varId: number): Promise<void> {
    let conferma = await this.service.conferma('Eliminare la connessione selezionata?');

    if (conferma) {
      this.service.eliminaConnessione(varId);
    }
  }

  // ---------------------------------------------------------------------------
  // Vista: panning, zoom e rilascio dei nuovi dispositivi
  // ---------------------------------------------------------------------------

  protected iniziaPanoramica(varEvento: PointerEvent): void {
    if (varEvento.button !== 0 && varEvento.button !== 1) {
      return;
    }

    varEvento.preventDefault();

    let partenzaX = varEvento.clientX;
    let partenzaY = varEvento.clientY;
    let panInizialeX = this.service.panX();
    let panInizialeY = this.service.panY();
    let spostato = false;

    let sposta = (varMovimento: PointerEvent) => {
      let deltaX = varMovimento.clientX - partenzaX;
      let deltaY = varMovimento.clientY - partenzaY;

      if (Math.abs(deltaX) > SOGLIA_TRASCINAMENTO || Math.abs(deltaY) > SOGLIA_TRASCINAMENTO) {
        spostato = true;
      }

      this.service.panX.set(panInizialeX + deltaX);
      this.service.panY.set(panInizialeY + deltaY);
    };

    let termina = () => {
      window.removeEventListener('pointermove', sposta);
      window.removeEventListener('pointerup', termina);

      // Un click sullo sfondo deseleziona il dispositivo corrente
      if (!spostato) {
        this.service.idSelezionato.set(null);
      }
    };

    window.addEventListener('pointermove', sposta);
    window.addEventListener('pointerup', termina);
  }

  protected gestisciZoom(varEvento: WheelEvent): void {
    varEvento.preventDefault();

    let zoomAttuale = this.service.zoom();
    let fattore = varEvento.deltaY < 0 ? 1.1 : 0.9;
    let nuovoZoom = Math.min(2.5, Math.max(0.3, zoomAttuale * fattore));

    if (nuovoZoom === zoomAttuale) {
      return;
    }

    // Il punto sotto al puntatore resta fermo mentre il canvas si ingrandisce
    let area = varEvento.currentTarget as HTMLElement;
    let rettangolo = area.getBoundingClientRect();
    let puntatoreX = varEvento.clientX - rettangolo.left;
    let puntatoreY = varEvento.clientY - rettangolo.top;
    let mondoX = (puntatoreX - this.service.panX()) / zoomAttuale;
    let mondoY = (puntatoreY - this.service.panY()) / zoomAttuale;

    this.service.panX.set(puntatoreX - mondoX * nuovoZoom);
    this.service.panY.set(puntatoreY - mondoY * nuovoZoom);
    this.service.zoom.set(nuovoZoom);
  }

  protected consentiRilascio(varEvento: DragEvent): void {
    varEvento.preventDefault();
  }

  protected rilasciaDispositivo(varEvento: DragEvent): void {
    varEvento.preventDefault();

    let tipo = varEvento.dataTransfer?.getData('text/plain') as TipoDispositivo;

    if (!tipo) {
      return;
    }

    let area = varEvento.currentTarget as HTMLElement;
    let rettangolo = area.getBoundingClientRect();
    let zoom = this.service.zoom();

    // Il dispositivo viene centrato nel punto in cui è stato rilasciato
    let x =
      (varEvento.clientX - rettangolo.left - this.service.panX()) / zoom -
      LARGHEZZA_DISPOSITIVO / 2;
    let y =
      (varEvento.clientY - rettangolo.top - this.service.panY()) / zoom - ALTEZZA_DISPOSITIVO / 2;

    this.service.aggiungiDispositivo(tipo, x, y);
  }

  private trovaDispositivo(varElenco: Dispositivo[], varId?: number): Dispositivo | undefined {
    for (let dispositivo of varElenco) {
      if (dispositivo.id === varId) {
        return dispositivo;
      }
    }

    return undefined;
  }
}
