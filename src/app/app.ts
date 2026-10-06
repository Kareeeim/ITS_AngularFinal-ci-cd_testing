import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Conferma } from './components/conferma/conferma';
import { TopologiaService } from './services/topologia-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Conferma],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly service = inject(TopologiaService);
}
