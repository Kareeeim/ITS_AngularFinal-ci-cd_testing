import { Routes } from '@angular/router';
import { Canvas } from './components/canvas/canvas';
import { PaginaDispositivo } from './components/pagina-dispositivo/pagina-dispositivo';

export const routes: Routes = [
  { path: '', redirectTo: 'canvas', pathMatch: 'full' },
  { path: 'canvas', component: Canvas },
  { path: 'dispositivo/:id', component: PaginaDispositivo }, // dispositivo/3
  { path: '**', redirectTo: 'canvas' },
];
