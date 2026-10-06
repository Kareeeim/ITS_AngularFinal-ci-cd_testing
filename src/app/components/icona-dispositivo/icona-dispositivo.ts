import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icona-dispositivo',
  imports: [],
  templateUrl: './icona-dispositivo.html',
  styleUrl: './icona-dispositivo.css',
})
export class IconaDispositivo {
  @Input() tipo?: string;

  get classe(): string {
    return 'icona-dispositivo tipo-' + (this.tipo ?? 'pc').toLowerCase();
  }
}
