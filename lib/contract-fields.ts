export const FIELD_TYPES = [
  "texto",
  "numerico",
  "moneda",
  "fecha_texto",
  "lugar_fecha",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldSeed = {
  clave: string;
  etiqueta: string;
  tipo: FieldType;
  ejemplo: string;
};

export type FieldInput = FieldSeed & {
  obligatorio?: boolean;
};

export type FieldErrors = Record<string, string>;

export type ValidationResult = {
  ok: boolean;
  errores: FieldErrors;
  valores: Record<string, string>;
  fechas: Record<string, CalendarDate | undefined>;
};

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

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

const WORDS = "[a-záéíóúüñ]+(?:\\s+[a-záéíóúüñ]+)*";
const MONTH_PATTERN = MONTHS.join("|");

const DATE_TEXT = new RegExp(
  `^(${WORDS})\\s+\\((\\d{1,2})\\)\\s+de\\s+(${MONTH_PATTERN})\\s+de\\s+(${WORDS})\\s+\\((\\d{4})\\)$`,
  "i",
);

const PLACE_DATE = new RegExp(
  `^a\\s+los\\s+(${WORDS})\\s+\\((\\d{1,2})\\)\\s+d[ií]as?\\s+del\\s+mes\\s+de\\s+(${MONTH_PATTERN})\\s+de\\s+(${WORDS})\\s+\\((\\d{4})\\)$`,
  "i",
);

const START_DATE = "dieciséis (16) de septiembre de dos mil veintiséis (2026)";
const END_DATE = "treinta (30) de septiembre de dos mil veintiséis (2026)";
const SIGNATURE =
  "CARTAGENA, a los dieciséis (16) días del mes de septiembre de dos mil veintiséis (2026)";

export const TYPE_HINTS: Record<FieldType, string> = {
  texto: "Solo letras. Los números se descartan solos.",
  numerico: "Escribe solo los dígitos. Los puntos de miles se agregan solos.",
  moneda: "Escribe el valor en pesos. El signo $ y los puntos se agregan solos.",
  fecha_texto: "Elige la fecha. El texto del contrato se escribe solo.",
  lugar_fecha: "Escribe la ciudad y elige la fecha. La frase de firma se escribe sola.",
};

export const ROLE_SEEDS: Array<{
  nombre: string;
  descripcion: string;
  atributos: FieldSeed[];
}> = [
  {
    nombre: "LIDER DE CAMARERIA",
    descripcion:
      "Lidera el equipo de camarería. El contrato registra trabajador, cédula, cargo, fechas, remuneración y firma.",
    atributos: contractAttributes("XXXXX", "CAMARERA"),
  },
  {
    nombre: "AUXILIAR DE ÁREAS PÚBLICAS",
    descripcion:
      "Apoya el aseo y el orden de las zonas comunes. Exige los datos de contrato de este cargo.",
    atributos: contractAttributes("XXXXX", "AUXILIAR DE ÁREAS PÚBLICAS"),
  },
  {
    nombre: "CAMARERA",
    descripcion:
      "Prepara y asea habitaciones. Exige los datos de contrato de camarera.",
    atributos: contractAttributes("MATEO JOSE ZARATE MENDOZA", "CAMARERA"),
  },
  {
    nombre: "RECEPCIONISTA",
    descripcion:
      "Atiende el ingreso y la recepción. Exige los datos de contrato de recepcionista.",
    atributos: contractAttributes("MATEO JOSE ZARATE MENDOZA", "RECEPCIONISTA"),
  },
];

function contractAttributes(nombreEjemplo: string, cargoEjemplo: string): FieldSeed[] {
  return [
    {
      clave: "nombre_trabajador",
      etiqueta: "Nombre del trabajador",
      tipo: "texto",
      ejemplo: nombreEjemplo,
    },
    {
      clave: "cedula",
      etiqueta: "Cédula de ciudadanía",
      tipo: "numerico",
      ejemplo: "1.143.325.667",
    },
    {
      clave: "cargo",
      etiqueta: "Cargo a desempeñar",
      tipo: "texto",
      ejemplo: cargoEjemplo,
    },
    {
      clave: "fecha_inicio",
      etiqueta: "Fecha de inicio",
      tipo: "fecha_texto",
      ejemplo: START_DATE,
    },
    {
      clave: "fecha_fin",
      etiqueta: "Fecha estimada de finalización",
      tipo: "fecha_texto",
      ejemplo: END_DATE,
    },
    {
      clave: "remuneracion",
      etiqueta: "Remuneración",
      tipo: "moneda",
      ejemplo: "$1.750.905",
    },
    {
      clave: "auxilio_transporte",
      etiqueta: "Auxilio de transporte",
      tipo: "moneda",
      ejemplo: "$249.095",
    },
    {
      clave: "lugar_fecha_firma",
      etiqueta: "Lugar y fecha de firma",
      tipo: "lugar_fecha",
      ejemplo: SIGNATURE,
    },
  ];
}

export function validateValues(
  fields: FieldInput[],
  raw: Record<string, string | undefined>,
): ValidationResult {
  const errores: FieldErrors = {};
  const valores: Record<string, string> = {};
  const fechas: Record<string, CalendarDate | undefined> = {};
  const known = new Set(fields.map((field) => field.clave));

  for (const key of Object.keys(raw)) {
    if (!known.has(key)) {
      errores[key] = "Este dato no pertenece al rol seleccionado.";
    }
  }

  for (const field of fields) {
    const original = raw[field.clave] ?? "";
    const required = field.obligatorio !== false;
    if (required && tidy(original).length === 0) {
      errores[field.clave] = "Este campo es obligatorio.";
      continue;
    }
    if (!required && tidy(original).length === 0) {
      continue;
    }

    const parsed = validateByField(field, original);
    if (parsed.error) {
      errores[field.clave] = parsed.error;
      continue;
    }
    valores[field.clave] = parsed.value;
    if (parsed.date) fechas[field.clave] = parsed.date;
  }

  const start = fechas.fecha_inicio;
  const end = fechas.fecha_fin;
  if (start && end && compareDates(end, start) < 0) {
    errores.fecha_fin =
      "La fecha estimada de finalización debe ser igual o posterior a la fecha de inicio.";
  }

  return { ok: Object.keys(errores).length === 0, errores, valores, fechas };
}

function validateByField(
  field: FieldInput,
  original: string,
): { value: string; error?: string; date?: CalendarDate } {
  if (field.clave === "nombre_trabajador") {
    return validatePersonName(original);
  }
  if (field.clave === "cargo" || field.tipo === "texto") {
    return validateWords(original, field.clave === "cargo" ? 1 : 1, 80);
  }
  if (field.tipo === "numerico") return validateCedula(original);
  if (field.tipo === "moneda") return validateCurrency(original);
  if (field.tipo === "fecha_texto") return validateDateText(original);
  if (field.tipo === "lugar_fecha") return validatePlaceDate(original);
  return { value: "", error: "Tipo de dato no soportado." };
}

function validatePersonName(original: string): { value: string; error?: string } {
  const value = tidy(original);
  const parts = value.split(" ");
  if (
    parts.length < 2 ||
    parts.some((part) => !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}$/.test(part)) ||
    value.length > 80
  ) {
    return {
      value,
      error: "Escribe nombre y apellido, solo letras, con al menos dos palabras.",
    };
  }
  return { value };
}

function validateWords(
  original: string,
  minWords: number,
  maxLength: number,
): { value: string; error?: string } {
  const value = tidy(original);
  const parts = value.split(" ").filter(Boolean);
  if (
    value.length < 3 ||
    value.length > maxLength ||
    parts.length < minWords ||
    parts.some((part) => !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}$/.test(part))
  ) {
    return {
      value,
      error: "Usa solo letras y espacios, como en el ejemplo del rol.",
    };
  }
  return { value };
}

function validateCedula(original: string): { value: string; error?: string } {
  const formatted = formatCedulaInput(original);
  const digits = formatted.replaceAll(".", "");
  if (!/^[1-9]\d{5,9}$/.test(digits)) {
    return {
      value: formatted,
      error: "La cédula debe tener entre 6 y 10 dígitos y no puede empezar por cero.",
    };
  }
  return { value: formatted };
}

function validateCurrency(original: string): { value: string; error?: string } {
  const formatted = formatCurrencyInput(original);
  const digits = formatted.replace(/\D/g, "");
  const amount = Number(digits);
  if (!digits || !Number.isSafeInteger(amount) || amount <= 0 || amount > 999_999_999) {
    return { value: formatted, error: "El valor debe ser un entero entre $1 y $999.999.999." };
  }
  return { value: formatted };
}

function validateDateText(original: string): {
  value: string;
  error?: string;
  date?: CalendarDate;
} {
  const isoSpoken = spokenFromIso(tidy(original));
  if (isoSpoken) {
    return validateDateText(isoSpoken);
  }
  const value = tidy(original);
  const match = DATE_TEXT.exec(value);
  if (!match) {
    return {
      value,
      error: `Usa el formato de fecha en letras. Ejemplo: ${START_DATE}.`,
    };
  }
  const parsed = parseSpokenDate(match[1], match[2], match[3], match[4], match[5]);
  if (typeof parsed === "string") return { value, error: parsed };
  return { value, date: parsed };
}

function validatePlaceDate(original: string): {
  value: string;
  error?: string;
  date?: CalendarDate;
} {
  const value = tidy(original);
  const comma = value.indexOf(",");
  if (comma === -1) {
    return {
      value,
      error: "Elige la fecha de firma. La frase del contrato se completa sola.",
    };
  }
  const city = value.slice(0, comma).trim();
  const rest = value.slice(comma + 1).trim();
  if (!/^[A-ZÁÉÍÓÚÜÑ]{2,}(?: [A-ZÁÉÍÓÚÜÑ]{2,})*$/.test(city)) {
    return {
      value,
      error: "La ciudad debe ir en mayúsculas y solo con letras, por ejemplo CARTAGENA.",
    };
  }
  const match = PLACE_DATE.exec(rest);
  if (!match) {
    return {
      value,
      error: `Después de la ciudad usa "a los ... días del mes de ...". Ejemplo: ${SIGNATURE}.`,
    };
  }
  const parsed = parseSpokenDate(match[1], match[2], match[3], match[4], match[5]);
  if (typeof parsed === "string") return { value, error: parsed };
  return { value: `${city}, ${rest}`, date: parsed };
}

function parseSpokenDate(
  dayWords: string,
  dayDigits: string,
  monthName: string,
  yearWords: string,
  yearDigits: string,
): CalendarDate | string {
  const day = Number(dayDigits);
  const year = Number(yearDigits);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return "El día entre paréntesis debe estar entre 1 y 31.";
  }
  if (fold(dayWords) !== fold(numberToWords(day))) {
    return `El día en letras no coincide con (${day}). Debe escribirse "${numberToWords(day)}".`;
  }
  const month = MONTHS.indexOf(fold(monthName) as (typeof MONTHS)[number]) + 1;
  if (month === 0) return "El mes no es válido.";
  const expectedYear = yearToWords(year);
  if (!expectedYear) return "El año debe estar entre 1900 y 2099.";
  if (fold(yearWords) !== fold(expectedYear)) {
    return `El año en letras no coincide con (${year}). Debe escribirse "${expectedYear}".`;
  }
  if (!isRealDate(year, month, day)) {
    return "Esa fecha no existe en el calendario.";
  }
  return { year, month, day };
}

function numberToWords(value: number): string {
  if (value < 10) return UNITS[value];
  if (value < 20) return TEENS[value - 10];
  if (value < 30) return TWENTIES[value - 20];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  if (units === 0) return TENS[tens];
  return `${TENS[tens]} y ${UNITS[units]}`;
}

function yearToWords(year: number): string | null {
  if (year >= 2000 && year <= 2099) {
    const rest = year - 2000;
    return rest === 0 ? "dos mil" : `dos mil ${numberToWords(rest)}`;
  }
  if (year >= 1900 && year <= 1999) {
    const rest = year - 1900;
    return rest === 0 ? "mil novecientos" : `mil novecientos ${numberToWords(rest)}`;
  }
  return null;
}

function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function compareDates(left: CalendarDate, right: CalendarDate): number {
  return (
    left.year * 10000 +
    left.month * 100 +
    left.day -
    (right.year * 10000 + right.month * 100 + right.day)
  );
}

function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatCedulaInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
  if (!digits) return "";
  return formatThousands(digits);
}

export function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  if (!digits) return "";
  return `$${formatThousands(digits)}`;
}

export function formatWordsInput(raw: string): string {
  return raw.replace(/[0-9]/g, "").replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ");
}

export function spokenFromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isRealDate(year, month, day)) return "";
  const yearWords = yearToWords(year);
  if (!yearWords) return "";
  return `${numberToWords(day)} (${day}) de ${MONTHS[month - 1]} de ${yearWords} (${year})`;
}

export function isoFromSpoken(value: string): string {
  const match = DATE_TEXT.exec(tidy(value));
  if (!match) return "";
  const parsed = parseSpokenDate(match[1], match[2], match[3], match[4], match[5]);
  if (typeof parsed === "string") return "";
  return toIso(parsed);
}

export function signatureFromParts(city: string, iso: string): string {
  const clean = city
    .toLocaleUpperCase("es-CO")
    .replace(/[^A-ZÁÉÍÓÚÜÑ ]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ /, "");
  const spoken = spokenFromIso(iso);
  if (!clean.trim()) return "";
  if (!spoken) return clean;
  const match = DATE_TEXT.exec(spoken);
  if (!match) return clean;
  const dayLabel = Number(match[2]) === 1 ? "día" : "días";
  const trailing = clean.endsWith(" ") ? " " : "";
  return `${clean.trim()}${trailing}, a los ${match[1]} (${match[2]}) ${dayLabel} del mes de ${match[3]} de ${match[4]} (${match[5]})`;
}

export function signatureParts(value: string): { city: string; iso: string } {
  const comma = value.indexOf(",");
  if (comma === -1) return { city: value, iso: "" };
  const city = value.slice(0, comma);
  const rest = tidy(value.slice(comma + 1));
  const match = PLACE_DATE.exec(rest);
  if (!match) return { city, iso: "" };
  const parsed = parseSpokenDate(match[1], match[2], match[3], match[4], match[5]);
  if (typeof parsed === "string") return { city, iso: "" };
  return { city, iso: toIso(parsed) };
}

function toIso(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function tidy(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
