export type TipoDispositivo = 'PC' | 'Switch' | 'Router';

export type StatoDispositivo = 'Online' | 'Offline' | 'Manutenzione';

/** Larghezza in pixel del riquadro di un dispositivo sul canvas. */
export const LARGHEZZA_DISPOSITIVO = 100;

/** Altezza in pixel del riquadro di un dispositivo sul canvas. */
export const ALTEZZA_DISPOSITIVO = 90;

export class Dispositivo {
  id?: number;
  tipo?: TipoDispositivo;
  nome?: string;
  x?: number;
  y?: number;
  ip?: string;
  hostname?: string;
  stato?: StatoDispositivo;

  constructor(
    varId?: number,
    varTipo?: TipoDispositivo,
    varNome?: string,
    varX?: number,
    varY?: number,
    varIp?: string,
    varHostname?: string,
    varStato?: StatoDispositivo,
  ) {
    this.id = varId;
    this.tipo = varTipo;
    this.nome = varNome;
    this.x = varX;
    this.y = varY;
    this.ip = varIp;
    this.hostname = varHostname ?? (varNome ? varNome.toLowerCase().replace(/ /g, '-') : '');
    this.stato = varStato ?? 'Online';
  }

  /**
   * Restituisce una copia del dispositivo, con gli eventuali campi indicati
   * sostituiti. Le copie permettono ai signal di accorgersi dei cambiamenti.
   */
  copia(varModifiche?: Partial<Dispositivo>): Dispositivo {
    let copia = new Dispositivo(
      this.id,
      this.tipo,
      this.nome,
      this.x,
      this.y,
      this.ip,
      this.hostname,
      this.stato,
    );

    return Object.assign(copia, varModifiche ?? {});
  }
}
