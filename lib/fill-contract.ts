import { parsePesos, pesosEnLetras } from "@/lib/pesos";

const KEYS = [
  "nombre_trabajador",
  "cedula",
  "cargo",
  "fecha_inicio",
  "fecha_fin",
  "remuneracion",
  "remuneracion_letras",
  "auxilio_transporte",
  "auxilio_letras",
  "lugar_fecha_firma",
] as const;

export function fillContract(markdown: string, valores: Record<string, string>): string {
  const remuneracion = parsePesos(valores.remuneracion ?? "");
  const auxilio = parsePesos(valores.auxilio_transporte ?? "");
  const replacements: Record<string, string> = {
    nombre_trabajador: valores.nombre_trabajador ?? "",
    cedula: valores.cedula ?? "",
    cargo: valores.cargo ?? "",
    fecha_inicio: valores.fecha_inicio ?? "",
    fecha_fin: valores.fecha_fin ?? "",
    remuneracion: valores.remuneracion ?? "",
    remuneracion_letras: pesosEnLetras(remuneracion),
    auxilio_transporte: valores.auxilio_transporte ?? "",
    auxilio_letras: pesosEnLetras(auxilio),
    lugar_fecha_firma: valores.lugar_fecha_firma ?? "",
  };

  return markdown.replace(/\{\{([a-z_]+)\}\}/g, (token, key: string) => {
    if (!KEYS.includes(key as (typeof KEYS)[number])) return token;
    return replacements[key] ?? token;
  });
}
