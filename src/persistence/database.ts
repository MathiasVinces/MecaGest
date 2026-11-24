import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { schema } from './schema.js';

export class Database {
  readonly connection: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.connection = new DatabaseSync(path);
    this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    const version = this.get<{ user_version: number }>('PRAGMA user_version')!.user_version;
    if (version === 0) this.transaction(() => this.connection.exec(schema));
    else if (version !== 1) throw new Error(`Versión de base de datos no compatible: ${version}`);
  }

  get<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
    return this.connection.prepare(sql).get(...params) as T | undefined;
  }

  all<T>(sql: string, ...params: SQLInputValue[]): T[] {
    return this.connection.prepare(sql).all(...params) as T[];
  }

  run(sql: string, ...params: SQLInputValue[]): void {
    this.connection.prepare(sql).run(...params);
  }

  // El callback debe ser síncrono: ninguna operación puede salir de la transacción.
  transaction<T>(work: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const value = work();
      if (value instanceof Promise) throw new Error('Una transacción no puede ser asíncrona');
      this.connection.exec('COMMIT');
      return value;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void { this.connection.close(); }
}
