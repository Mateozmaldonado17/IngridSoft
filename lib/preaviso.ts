import { plainDateFromIso, spokenFromIso } from "@/lib/contract-fields";

export type PreavisoTipo = "fijo" | "indefinido";
export type PreavisoFormato = "hablado" | "corto";

export function preavisoDate(iso: string, formato: PreavisoFormato): string {
  return formato === "hablado" ? spokenFromIso(iso) : plainDateFromIso(iso);
}

export function preavisoNotice(tipo: PreavisoTipo, fecha: string): string {
  if (tipo === "indefinido") {
    return `Se procede a avisarle por escrito la voluntad del Empleador de dar por terminado el contrato de trabajo a término indefinido. Por lo anterior se le procederá a cancelar las prestaciones debidas a la fecha de terminación del contrato, **teniendo como fecha de terminación el ${fecha}.**`;
  }
  return `En virtud a lo estipulado al numeral primero (1º) del Art 46 del C:S.T, modificado por la Ley 2466 DE 2025 en su articulo 6º., se procede a avisarle por escrito dentro de un término no inferior a (30) días al de su culminación del contrato a término fijo, la voluntad del Empleador de no prorrogar el mismo. Por lo anterior se le procederá a cancelar las prestaciones debidas a fecha de terminación del contrato, **teniendo como fecha de vencimiento el ${fecha}.**`;
}
