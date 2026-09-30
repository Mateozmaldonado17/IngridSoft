const UNITS = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
];

const TEENS = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
];

const TWENTIES = [
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
];

const TENS = [
  "",
  "",
  "",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

export function pesosEnLetras(amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 999_999_999) {
    throw new Error("El valor no se puede convertir a letras.");
  }
  return upcase(integerToWords(amount));
}

export function parsePesos(formatted: string): number {
  const digits = formatted.replace(/[^\d]/g, "");
  return Number(digits);
}

function integerToWords(value: number): string {
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1_000;
  const parts: string[] = [];

  if (millions === 1) parts.push("un millón");
  else if (millions > 1) parts.push(`${groupToWords(millions, true)} millones`);

  if (thousands === 1) parts.push("mil");
  else if (thousands > 1) parts.push(`${groupToWords(thousands, true)} mil`);

  if (rest > 0) parts.push(groupToWords(rest, false));
  return parts.join(" ");
}

function groupToWords(value: number, apocope: boolean): string {
  if (value === 100) return "cien";
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const head = hundreds > 0 ? HUNDREDS[hundreds] : "";
  if (rest === 0) return head;
  const tail = belowHundred(rest, apocope);
  return head ? `${head} ${tail}` : tail;
}

function belowHundred(value: number, apocope: boolean): string {
  if (value < 10) {
    if (value === 1) return apocope ? "un" : "uno";
    return UNITS[value];
  }
  if (value < 20) return TEENS[value - 10];
  if (value < 30) {
    if (value === 21) return apocope ? "veintiún" : "veintiuno";
    return TWENTIES[value - 20];
  }
  const tens = Math.floor(value / 10);
  const units = value % 10;
  if (units === 0) return TENS[tens];
  const unit = units === 1 && apocope ? "un" : UNITS[units];
  return `${TENS[tens]} y ${unit}`;
}

function upcase(value: string): string {
  return value.toLocaleUpperCase("es-CO");
}
