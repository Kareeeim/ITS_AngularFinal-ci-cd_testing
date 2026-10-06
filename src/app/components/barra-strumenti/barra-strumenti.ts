import { Component, computed, inject } from '@angular/core';
import { TipoDispositivo } from '../../models/dispositivo';
import { TopologiaService } from '../../services/topologia-service';
import { IconaDispositivo } from '../icona-dispositivo/icona-dispositivo';

@Component({
  selector: 'app-barra-strumenti',
  imports: [IconaDispositivo],
  templateUrl: './barra-strumenti.html',
  styleUrl: './barra-strumenti.css',
})
export class BarraStrumenti {
  protected readonly service = inject(TopologiaService);

  protected readonly tipi: TipoDispositivo[] = ['PC', 'Switch', 'Router'];

  protected readonly percentualeZoom = computed(() => Math.round(this.service.zoom() * 100));

  protected aggiungi(varTipo: TipoDispositivo): void {
    this.service.aggiungiDispositivoInVista(varTipo);
  }

  protected iniziaTrascinamento(varEvento: DragEvent, varTipo: TipoDispositivo): void {
    varEvento.dataTransfer?.setData('text/plain', varTipo);
  }

  protected esporta(): void {
    let contenuto = this.service.esportaJson();
    let file = new Blob([contenuto], { type: 'application/json' });

    let collegamento = document.createElement('a');
    collegamento.href = URL.createObjectURL(file);
    collegamento.download = 'topologia-rete.json';
    collegamento.click();

    URL.revokeObjectURL(collegamento.href);
    this.service.mostraMessaggio('Topologia esportata in topologia-rete.json');
  }

  protected importa(varEvento: Event): void {
    let input = varEvento.target as HTMLInputElement;
    let file = input.files?.[0];

    if (!file) {
      return;
    }

    let lettore = new FileReader();

    lettore.onload = () => {
      this.service.importaJson(String(lettore.result));
      input.value = '';
    };

    lettore.readAsText(file);
  }

  protected async cancella(): Promise<void> {
    let conferma = await this.service.conferma(
      'Cancellare la topologia salvata nel Local Storage? Il canvas verrà svuotato.',
    );

    if (conferma) {
      this.service.cancellaTopologia();
    }
  }
}
