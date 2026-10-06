import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Connessione } from '../../models/connessione';
import { Dispositivo, StatoDispositivo } from '../../models/dispositivo';
import { TopologiaService } from '../../services/topologia-service';
import { IconaDispositivo } from '../icona-dispositivo/icona-dispositivo';

/** Dispositivo collegato a quello mostrato nel pannello, con la relativa connessione. */
type Collegamento = {
  connessione: Connessione;
  dispositivo: Dispositivo;
};

@Component({
  selector: 'app-dettaglio',
  imports: [FormsModule, RouterLink, IconaDispositivo],
  templateUrl: './dettaglio.html',
  styleUrl: './dettaglio.css',
})
export class Dettaglio {
  protected readonly service = inject(TopologiaService);

  protected readonly stati: StatoDispositivo[] = ['Online', 'Offline', 'Manutenzione'];

  /** Dispositivo di cui mostrare il dettaglio, scelto con il click destro sul canvas. */
  protected readonly dispositivo = computed<Dispositivo | null>(() => {
    let id = this.service.idDettaglio();

    return id === null ? null : this.service.cercaDispositivo(id);
  });

  protected readonly collegamenti = computed<Collegamento[]>(() => {
    let dispositivo = this.dispositivo();

    if (!dispositivo || dispositivo.id === undefined) {
      return [];
    }

    let risultato: Collegamento[] = [];

    for (let connessione of this.service.connessioniDispositivo(dispositivo.id)) {
      let altroId = this.service.altroCapo(connessione, dispositivo.id);
      let altro = altroId === null ? null : this.service.cercaDispositivo(altroId);

      if (altro) {
        risultato.push({ connessione: connessione, dispositivo: altro });
      }
    }

    return risultato;
  });

  /*
   * I campi del pannello scrivono direttamente sulla topologia: ogni modifica
   * è immediatamente visibile anche sul canvas.
   */

  protected get nome(): string {
    return this.dispositivo()?.nome ?? '';
  }

  protected set nome(varNome: string) {
    let dispositivo = this.dispositivo();

    if (dispositivo?.id !== undefined) {
      this.service.rinominaDispositivo(dispositivo.id, varNome);
    }
  }

  protected get ip(): string {
    return this.dispositivo()?.ip ?? '';
  }

  protected set ip(varIp: string) {
    let dispositivo = this.dispositivo();

    if (dispositivo?.id !== undefined) {
      this.service.aggiornaIp(dispositivo.id, varIp);
    }
  }

  protected get hostname(): string {
    return this.dispositivo()?.hostname ?? '';
  }

  protected set hostname(varHostname: string) {
    let dispositivo = this.dispositivo();

    if (dispositivo?.id !== undefined) {
      this.service.aggiornaHostname(dispositivo.id, varHostname);
    }
  }

  protected get stato(): StatoDispositivo {
    return this.dispositivo()?.stato ?? 'Online';
  }

  protected set stato(varStato: StatoDispositivo) {
    let dispositivo = this.dispositivo();

    if (dispositivo?.id !== undefined) {
      this.service.aggiornaStato(dispositivo.id, varStato);
    }
  }

  protected chiudi(): void {
    this.service.idDettaglio.set(null);
  }

  protected async eliminaDispositivo(): Promise<void> {
    let dispositivo = this.dispositivo();

    if (!dispositivo?.id) {
      return;
    }

    let conferma = await this.service.conferma(
      'Eliminare il dispositivo ' + dispositivo.nome + ' e le sue connessioni?',
    );

    if (conferma) {
      this.service.eliminaDispositivo(dispositivo.id);
    }
  }

  protected eliminaConnessione(varId: number): void {
    this.service.eliminaConnessione(varId);
  }
}
