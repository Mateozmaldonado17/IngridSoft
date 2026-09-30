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

export type ContractVariant = {
  clave: string;
  etiqueta: string;
};

export type RoleRecord = {
  id: number;
  nombre: string;
  descripcion: string;
  atributos: AttributeRecord[];
  variantes: ContractVariant[];
};

export type EmployeeRecord = {
  id: number;
  rolId: number;
  rolNombre: string;
  variante: string;
  varianteEtiqueta: string;
  valores: Record<string, string>;
};

export type SaveResult =
  | { ok: true; message: string; usuarioId: number }
  | { ok: false; message: string; errores: Record<string, string> };
