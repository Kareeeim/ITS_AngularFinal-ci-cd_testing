import { Component, inject } from '@angular/core';
import { TopologiaService } from '../../services/topologia-service';

/**
 * Finestra di conferma in stile Cyberpunk, mostrata al posto della finestra
 * nativa del browser. Il testo da chiedere arriva dal servizio, che si occupa
 * anche di risolvere la promessa restituita a chi ha richiesto la conferma.
 */
@Component({
  selector: 'app-conferma',
  templateUrl: './conferma.html',
  styleUrl: './conferma.css',
  host: {
    '(document:keydown.escape)': 'rispondi(false)',
  },
})
export class Conferma {
  protected readonly service = inject(TopologiaService);

  protected rispondi(varEsito: boolean): void {
    if (this.service.richiestaConferma() !== null) {
      this.service.rispondiConferma(varEsito);
    }
  }
}
