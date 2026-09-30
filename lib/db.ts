import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ROLE_SEEDS } from "@/lib/contract-fields";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "ingridsoft.db");

function openDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  migrate(database);
  return database;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rol_atributos (
      id INTEGER PRIMARY KEY,
      rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      clave TEXT NOT NULL,
      etiqueta TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'numerico', 'moneda', 'fecha_texto', 'lugar_fecha')),
      ejemplo TEXT NOT NULL,
      obligatorio INTEGER NOT NULL DEFAULT 1 CHECK (obligatorio IN (0, 1)),
      orden INTEGER NOT NULL,
      UNIQUE (rol_id, clave)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      rol_id INTEGER NOT NULL REFERENCES roles(id),
      creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS usuario_datos (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      atributo_id INTEGER NOT NULL REFERENCES rol_atributos(id),
      valor TEXT NOT NULL,
      UNIQUE (usuario_id, atributo_id)
    );

    CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);
    CREATE INDEX IF NOT EXISTS idx_usuario_datos_usuario ON usuario_datos(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_rol_atributos_rol ON rol_atributos(rol_id);
  `);

  const row = database.prepare("SELECT COUNT(*) AS total FROM roles").get() as {
    total: number;
  };
  if (row.total === 0) seedRoles(database);
}

function seedRoles(database: Database.Database) {
  const insertRole = database.prepare(
    "INSERT INTO roles (nombre, descripcion) VALUES (?, ?)",
  );
  const insertAttribute = database.prepare(
    `INSERT INTO rol_atributos
      (rol_id, clave, etiqueta, tipo, ejemplo, obligatorio, orden)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
  );

  const seed = database.transaction(() => {
    for (const role of ROLE_SEEDS) {
      const info = insertRole.run(role.nombre, role.descripcion);
      const roleId = Number(info.lastInsertRowid);
      role.atributos.forEach((attribute, index) => {
        insertAttribute.run(
          roleId,
          attribute.clave,
          attribute.etiqueta,
          attribute.tipo,
          attribute.ejemplo,
          index + 1,
        );
      });
    }
  });

  seed();
}

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

export const db = globalForDb.sqlite ?? openDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = db;
}
