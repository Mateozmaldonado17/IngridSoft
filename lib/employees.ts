import "server-only";
import { db } from "@/lib/db";
import { validateValues, type FieldType } from "@/lib/contract-fields";
import type { AttributeRecord, EmployeeRecord, RoleRecord, SaveResult } from "@/lib/staff-types";

export type { AttributeRecord, EmployeeRecord, RoleRecord, SaveResult };

type AttributeRow = {
  id: number;
  rol_id: number;
  clave: string;
  etiqueta: string;
  tipo: FieldType;
  ejemplo: string;
  obligatorio: number;
  orden: number;
};

type EmployeeJoinRow = {
  id: number;
  rol_id: number;
  rol_nombre: string;
  variante: string;
  variante_etiqueta: string | null;
  clave: string | null;
  valor: string | null;
};

export function listRoles(): RoleRecord[] {
  const roles = db
    .prepare("SELECT id, nombre, descripcion FROM roles ORDER BY id")
    .all() as Array<{ id: number; nombre: string; descripcion: string }>;
  const attributes = db
    .prepare(
      `SELECT id, rol_id, clave, etiqueta, tipo, ejemplo, obligatorio, orden
       FROM rol_atributos
       ORDER BY orden`,
    )
    .all() as AttributeRow[];
  const variants = db
    .prepare("SELECT rol_id, variante, etiqueta FROM contratos ORDER BY id")
    .all() as Array<{ rol_id: number; variante: string; etiqueta: string }>;

  return roles.map((role) => ({
    id: role.id,
    nombre: role.nombre,
    descripcion: role.descripcion,
    atributos: attributes
      .filter((attribute) => attribute.rol_id === role.id)
      .map(toAttribute),
    variantes: variants
      .filter((variant) => variant.rol_id === role.id)
      .map((variant) => ({ clave: variant.variante, etiqueta: variant.etiqueta })),
  }));
}

export function listEmployees(rolId: number | null): EmployeeRecord[] {
  const rows = db
    .prepare(
      `SELECT u.id, u.rol_id, u.variante, r.nombre AS rol_nombre,
              c.etiqueta AS variante_etiqueta, a.clave, d.valor
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN contratos c ON c.rol_id = u.rol_id AND c.variante = u.variante
       LEFT JOIN usuario_datos d ON d.usuario_id = u.id
       LEFT JOIN rol_atributos a ON a.id = d.atributo_id
       WHERE (? IS NULL OR u.rol_id = ?)
       ORDER BY u.id DESC, a.orden`,
    )
    .all(rolId, rolId) as EmployeeJoinRow[];

  const employees = new Map<number, EmployeeRecord>();
  for (const row of rows) {
    const current = employees.get(row.id) ?? {
      id: row.id,
      rolId: row.rol_id,
      rolNombre: row.rol_nombre,
      variante: row.variante,
      varianteEtiqueta: row.variante_etiqueta ?? "",
      valores: {},
    };
    if (row.clave && row.valor != null) current.valores[row.clave] = row.valor;
    employees.set(row.id, current);
  }
  return [...employees.values()];
}

export function saveEmployee(input: {
  usuarioId: number | null;
  rolId: number;
  variante: string;
  valores: Record<string, string>;
}): SaveResult {
  const role = listRoles().find((item) => item.id === input.rolId);
  if (!role) {
    return { ok: false, message: "Selecciona un rol válido.", errores: { rolId: "Selecciona un rol." } };
  }

  const variante =
    role.variantes.length === 1 ? role.variantes[0].clave : input.variante;
  if (!role.variantes.some((item) => item.clave === variante)) {
    return {
      ok: false,
      message: "Elige el tipo de contrato.",
      errores: { variante: "Elige el tipo de contrato." },
    };
  }

  const validation = validateValues(role.atributos, input.valores);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Revisa los datos. Hay campos que no cumplen el formato del rol.",
      errores: validation.errores,
    };
  }

  const cedula = validation.valores.cedula;
  if (cedula) {
    const duplicate = db
      .prepare(
        `SELECT u.id
         FROM usuario_datos d
         JOIN rol_atributos a ON a.id = d.atributo_id
         JOIN usuarios u ON u.id = d.usuario_id
         WHERE a.clave = 'cedula' AND d.valor = ? AND u.id != ?`,
      )
      .get(cedula, input.usuarioId ?? 0) as { id: number } | undefined;
    if (duplicate) {
      return {
        ok: false,
        message: "Ya existe un empleado con esa cédula.",
        errores: { cedula: "Ya existe un empleado con esa cédula." },
      };
    }
  }

  if (input.usuarioId != null) {
    const existing = db
      .prepare("SELECT id FROM usuarios WHERE id = ?")
      .get(input.usuarioId) as { id: number } | undefined;
    if (!existing) {
      return { ok: false, message: "No se encontró el empleado.", errores: {} };
    }
  }

  const now = new Date().toISOString();
  const persist = db.transaction(() => {
    let usuarioId = input.usuarioId;
    if (usuarioId == null) {
      const info = db
        .prepare("INSERT INTO usuarios (rol_id, variante) VALUES (?, ?)")
        .run(role.id, variante);
      usuarioId = Number(info.lastInsertRowid);
    } else {
      db.prepare(
        "UPDATE usuarios SET rol_id = ?, variante = ?, actualizado_en = ? WHERE id = ?",
      ).run(role.id, variante, now, usuarioId);
      db.prepare("DELETE FROM usuario_datos WHERE usuario_id = ?").run(usuarioId);
    }

    const insert = db.prepare(
      "INSERT INTO usuario_datos (usuario_id, atributo_id, valor) VALUES (?, ?, ?)",
    );
    for (const attribute of role.atributos) {
      const value = validation.valores[attribute.clave];
      if (value == null) continue;
      insert.run(usuarioId, attribute.id, value);
    }
    return usuarioId;
  });

  const usuarioId = persist();
  return {
    ok: true,
    usuarioId,
    message: input.usuarioId == null ? "Empleado guardado." : "Empleado actualizado.",
  };
}

export function getEmployee(usuarioId: number): EmployeeRecord | null {
  return listEmployees(null).find((employee) => employee.id === usuarioId) ?? null;
}

export function getContract(
  rolId: number,
  variante: string,
): { titulo: string; contenidoMd: string } | null {
  const row = db
    .prepare(
      `SELECT titulo, contenido_md AS contenidoMd
       FROM contratos
       WHERE rol_id = ? AND variante = ?`,
    )
    .get(rolId, variante) as { titulo: string; contenidoMd: string } | undefined;
  return row ?? null;
}

export function deleteEmployee(usuarioId: number): SaveResult {
  const existing = db
    .prepare("SELECT id FROM usuarios WHERE id = ?")
    .get(usuarioId) as { id: number } | undefined;
  if (!existing) {
    return { ok: false, message: "No se encontró el empleado.", errores: {} };
  }
  db.prepare("DELETE FROM usuarios WHERE id = ?").run(usuarioId);
  return { ok: true, usuarioId, message: "Empleado eliminado." };
}

function toAttribute(row: AttributeRow): AttributeRecord {
  return {
    id: row.id,
    clave: row.clave,
    etiqueta: row.etiqueta,
    tipo: row.tipo,
    ejemplo: row.ejemplo,
    obligatorio: row.obligatorio === 1,
    orden: row.orden,
  };
}
