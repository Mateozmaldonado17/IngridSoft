import type { FieldType } from "@/lib/contract-fields";

export type AttributeRecord = {
  id: number;
  clave: string;
  etiqueta: string;
  tipo: FieldType;
  ejemplo: string;
  obligatorio: boolean;
  orden: number;
};

export type RoleRecord = {
  id: number;
  nombre: string;
  descripcion: string;
  atributos: AttributeRecord[];
};

export type EmployeeRecord = {
  id: number;
  rolId: number;
  rolNombre: string;
  valores: Record<string, string>;
};

export type SaveResult =
  | { ok: true; message: string; usuarioId: number }
  | { ok: false; message: string; errores: Record<string, string> };
