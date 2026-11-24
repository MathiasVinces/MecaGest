import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from '../src/persistence/database.js';

const opened: Database[] = [];
afterEach(() => { for (const db of opened.splice(0)) db.close(); });
function memory() { const db = new Database(':memory:'); opened.push(db); return db; }

describe('SQLite real', () => {
  it('crea las tablas y activa las claves foráneas', () => {
    const db = memory();
    expect(db.get<{ foreign_keys: number }>('PRAGMA foreign_keys')!.foreign_keys).toBe(1);
    expect(() => db.run("INSERT INTO vehicles VALUES ('v','missing','ABC123','Marca','Modelo','2026-11-24')")).toThrow();
  });
  it('revierte todas las escrituras de una operación fallida', () => {
    const db = memory();
    expect(() => db.transaction(() => {
      db.run("INSERT INTO clients VALUES ('c','Cliente ficticio','000','2026-11-24')");
      throw new Error('Interrupción simulada');
    })).toThrow('Interrupción');
    expect(db.all('SELECT * FROM clients')).toEqual([]);
  });
  it('conserva los registros al cerrar y reabrir el archivo', () => {
    const directory = mkdtempSync(join(tmpdir(), 'mecagest-'));
    try {
      const db = new Database(join(directory, 'test.sqlite'));
      db.run("INSERT INTO clients VALUES ('c','Cliente ficticio','000','2026-11-24')");
      db.close();
      const reopened = new Database(join(directory, 'test.sqlite'));
      try { expect(reopened.all('SELECT * FROM clients')).toHaveLength(1); }
      finally { reopened.close(); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
