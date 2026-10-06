export class Connessione {
  id?: number;
  sourceId?: number;
  targetId?: number;

  constructor(varId?: number, varSource?: number, varTarget?: number) {
    this.id = varId;
    this.sourceId = varSource;
    this.targetId = varTarget;
  }
}
