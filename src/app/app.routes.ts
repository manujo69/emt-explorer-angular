import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../features/emt/components/mapa-emt/mapa-emt.component').then(m => m.MapaEMTComponent),
  },
]
