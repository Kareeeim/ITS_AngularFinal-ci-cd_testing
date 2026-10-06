import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Connessione } from '../../models/connessione';
import { Dispositivo } from '../../models/dispositivo';
import { TopologiaService } from '../../services/topologia-service';
import { IconaDispositivo } from '../icona-dispositivo/icona-dispositivo';

/** Dispositivo collegato a quello mostrato nella pagina. */
type Collegamento = {
  connessione: Connessione;
  dispositivo: Dispositivo;
};

@Component({
  selector: 'app-pagina-dispositivo',
  imports: [RouterLink, IconaDispositivo],
  templateUrl: './pagina-dispositivo.html',
  styleUrl: './pagina-dispositivo.css',
})
export class PaginaDispositivo {
  protected readonly service = inject(TopologiaService);

  private rottaAttiva = inject(ActivatedRoute);

  dispositivo: Dispositivo | null = null;
  collegamenti: Collegamento[] = [];

  ngOnInit() {
    this.rottaAttiva.params.subscribe((risultato) => {
      let identificativo: number = parseInt(risultato['id']);

      this.dispositivo = this.service.cercaDispositivo(identificativo);
      this.collegamenti = this.cercaCollegamenti(identificativo);
    });
  }

  private cercaCollegamenti(varId: number): Collegamento[] {
    let risultato: Collegamento[] = [];

    for (let connessione of this.service.connessioniDispositivo(varId)) {
      let altroId = this.service.altroCapo(connessione, varId);
      let altro = altroId === null ? null : this.service.cercaDispositivo(altroId);

      if (altro) {
        risultato.push({ connessione: connessione, dispositivo: altro });
      }
    }

    return risultato;
  }
}
