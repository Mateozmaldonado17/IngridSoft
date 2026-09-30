"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteEmployeeAction, saveEmployeeAction } from "@/app/actions";
import {
  TYPE_HINTS,
  formatCedulaInput,
  formatCurrencyInput,
  formatWordsInput,
  isoFromSpoken,
  signatureFromParts,
  signatureParts,
  spokenFromIso,
  validateValues,
} from "@/lib/contract-fields";
import { preavisoDate, type PreavisoFormato, type PreavisoTipo } from "@/lib/preaviso";
import type { AttributeRecord, EmployeeRecord, RoleRecord } from "@/lib/staff-types";

const COLUMNS = [
  ["nombre_trabajador", "Nombre"],
  ["cedula", "Cédula"],
  ["cargo", "Cargo"],
  ["fecha_inicio", "Inicio"],
  ["fecha_fin", "Finalización"],
  ["remuneracion", "Remuneración"],
  ["auxilio_transporte", "Auxilio"],
  ["lugar_fecha_firma", "Firma"],
] as const;

export function StaffBoard({
  roles,
  employees,
  selectedRoleId,
}: {
  roles: RoleRecord[];
  employees: EmployeeRecord[];
  selectedRoleId: number | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rolId, setRolId] = useState<number | "">("");
  const [variante, setVariante] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [pending, setPending] = useState(false);
  const [preavisoEmployee, setPreavisoEmployee] = useState<EmployeeRecord | null>(null);

  const selectedRole = roles.find((role) => role.id === rolId) ?? null;
  const editing = employees.find((employee) => employee.id === editingId) ?? null;

  const roleSummary = useMemo(
    () => roles.map((role) => ({ id: role.id, nombre: role.nombre })),
    [roles],
  );

  function selectRole(nextRoleId: number | "") {
    const role = roles.find((item) => item.id === nextRoleId);
    setRolId(nextRoleId);
    setVariante(role && role.variantes.length === 1 ? role.variantes[0].clave : "");
    if (!editingId && role) {
      setValores((current) => {
        const next = { ...current };
        for (const attribute of role.atributos) {
          if (attribute.clave !== "remuneracion" && attribute.clave !== "auxilio_transporte") continue;
          if (!next[attribute.clave]) next[attribute.clave] = attribute.ejemplo;
        }
        return next;
      });
    }
    setErrores({});
    setBanner("");
  }

  function beginEdit(employee: EmployeeRecord) {
    setEditingId(employee.id);
    setRolId(employee.rolId);
    setVariante(employee.variante);
    setValores({ ...employee.valores });
    setErrores({});
    setBanner("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setRolId("");
    setVariante("");
    setValores({});
    setErrores({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRole) {
      setErrores({ rolId: "Selecciona un rol." });
      setBanner("Selecciona el rol antes de guardar.");
      return;
    }

    if (selectedRole.variantes.length > 1 && !selectedRole.variantes.some((item) => item.clave === variante)) {
      setErrores({ variante: "Elige el tipo de contrato." });
      setBanner("Elige si el contrato de recepcionista es por obra o labor, o a término fijo.");
      return;
    }

    const validation = validateValues(selectedRole.atributos, valores);
    if (!validation.ok) {
      setErrores(validation.errores);
      setBanner("Revisa los datos. Hay campos que no cumplen el formato del rol.");
      return;
    }

    setPending(true);
    const result = await saveEmployeeAction({
      usuarioId: editingId,
      rolId: selectedRole.id,
      variante,
      valores: validation.valores,
    });
    setPending(false);
    setBanner(result.message);
    if (!result.ok) {
      setErrores(result.errores);
      return;
    }
    resetForm();
    router.refresh();
  }

  async function onDelete(employee: EmployeeRecord) {
    const name = employee.valores.nombre_trabajador ?? "este empleado";
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    setPending(true);
    const result = await deleteEmployeeAction(employee.id);
    setPending(false);
    setBanner(result.message);
    if (result.ok && editingId === employee.id) resetForm();
    if (result.ok) router.refresh();
  }

  function onFilter(nextRoleId: string) {
    const params = new URLSearchParams();
    if (nextRoleId) params.set("rol", nextRoleId);
    router.push(params.size ? `/?${params}` : "/");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-[#9a3412]">IngridSoft</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f1a17]">Personal por rol</h1>
        <p className="max-w-2xl text-base leading-7 text-[#57534e]">
          Carga un empleado, asígnale un rol y diligencia solo los datos que ese rol exige.
          El listado se puede filtrar por rol.
        </p>
      </header>

      {banner ? (
        <p className="rounded-lg border border-[#e7d7c7] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]" role="status">
          {banner}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-2xl border border-[#e7e0d6] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1f1a17]">
              {editing ? "Editar empleado" : "Nuevo empleado"}
            </h2>
            <p className="mt-1 text-sm text-[#78716c]">
              {editing
                ? "El rol define otra vez los campos obligatorios."
                : "Elige el rol para ver los campos que debes rellenar."}
            </p>
          </div>
          {editing ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-[#9a3412] underline-offset-2 hover:underline"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-[#44403c]">
          Rol
          <select
            name="rolId"
            value={rolId}
            onChange={(event) => selectRole(event.target.value ? Number(event.target.value) : "")}
            className="h-11 rounded-lg border border-[#d6d3d1] bg-white px-3 text-base font-normal text-[#1f1a17]"
          >
            <option value="">Selecciona un rol</option>
            {roleSummary.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nombre}
              </option>
            ))}
          </select>
        </label>
        {errores.rolId ? <FieldError message={errores.rolId} /> : null}
        {selectedRole && selectedRole.variantes.length > 1 ? (
          <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-[#44403c]">
            Tipo de contrato
            <select
              name="variante"
              value={variante}
              onChange={(event) => {
                setVariante(event.target.value);
                setErrores((current) => {
                  if (!current.variante) return current;
                  const rest = { ...current };
                  delete rest.variante;
                  return rest;
                });
              }}
              className="h-11 rounded-lg border border-[#d6d3d1] bg-white px-3 text-base font-normal text-[#1f1a17]"
            >
              <option value="">Selecciona la variante</option>
              {selectedRole.variantes.map((item) => (
                <option key={item.clave} value={item.clave}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
            {errores.variante ? <FieldError message={errores.variante} /> : null}
          </label>
        ) : null}
        {selectedRole ? (
          <p className="mt-3 text-sm leading-6 text-[#57534e]">{selectedRole.descripcion}</p>
        ) : null}

        {selectedRole ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {selectedRole.atributos.map((attribute) => (
              <FieldControl
                key={attribute.clave}
                attribute={attribute}
                value={valores[attribute.clave] ?? ""}
                error={errores[attribute.clave]}
                onChange={(next) => {
                  setValores((current) => ({ ...current, [attribute.clave]: next }));
                  setErrores((current) => {
                    if (!current[attribute.clave]) return current;
                    const rest = { ...current };
                    delete rest[attribute.clave];
                    return rest;
                  });
                }}
              />
            ))}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 h-11 rounded-full bg-[#9a3412] px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : editing ? "Actualizar empleado" : "Guardar empleado"}
        </button>
      </form>

      <section className="rounded-2xl border border-[#e7e0d6] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#efeae2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1f1a17]">Empleados</h2>
            <p className="text-sm text-[#78716c]">
              {employees.length} {employees.length === 1 ? "registro" : "registros"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#44403c]">
            Filtrar por rol
            <select
              value={selectedRoleId ?? ""}
              onChange={(event) => onFilter(event.target.value)}
              className="h-10 rounded-lg border border-[#d6d3d1] bg-white px-3 font-normal"
            >
              <option value="">Todos los roles</option>
              {roleSummary.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead className="bg-[#f7f4ef] text-[#57534e]">
              <tr>
                <th className="px-4 py-3 font-medium">Rol</th>
                {COLUMNS.map(([, label]) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="px-4 py-8 text-[#78716c]">
                    No hay empleados para este filtro.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-[#efeae2] align-top">
                    <td className="px-4 py-3 font-medium text-[#1f1a17]">
                      {employee.rolNombre}
                      {employee.variante !== "principal" ? (
                        <span className="mt-1 block text-xs font-normal text-[#78716c]">
                          {employee.varianteEtiqueta}
                        </span>
                      ) : null}
                    </td>
                    {COLUMNS.map(([key]) => (
                      <td key={key} className="max-w-[220px] px-4 py-3 text-[#44403c]">
                        {employee.valores[key] ?? "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <a
                          href={`/api/empleados/${employee.id}/contrato`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#9a3412]"
                        >
                          PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => setPreavisoEmployee(employee)}
                          className="font-medium text-[#9a3412]"
                        >
                          Preaviso
                        </button>
                        <button
                          type="button"
                          onClick={() => beginEdit(employee)}
                          className="font-medium text-[#9a3412]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(employee)}
                          disabled={pending}
                          className="font-medium text-[#78716c]"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {preavisoEmployee ? (
        <PreavisoDialog employee={preavisoEmployee} onClose={() => setPreavisoEmployee(null)} />
      ) : null}
    </div>
  );
}

function PreavisoDialog({ employee, onClose }: { employee: EmployeeRecord; onClose: () => void }) {
  const [tipo, setTipo] = useState<PreavisoTipo>(employee.variante === "termino_fijo" ? "fijo" : "obra");
  const [formato, setFormato] = useState<PreavisoFormato>("corto");
  const [fecha, setFecha] = useState(isoFromSpoken(employee.valores.fecha_fin ?? ""));
  const fechaTexto = preavisoDate(fecha, formato);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function generate() {
    if (!fechaTexto) return;
    const params = new URLSearchParams({ tipo, formato, fecha });
    window.open(
      `/api/empleados/${employee.id}/preaviso?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f1a17]/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preaviso-titulo"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="preaviso-titulo" className="text-lg font-semibold text-[#1f1a17]">
          Preaviso
        </h2>
        <p className="mt-1 text-sm text-[#57534e]">
          {employee.valores.nombre_trabajador ?? "Empleado"} · C.C. {employee.valores.cedula ?? "—"}
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-[#44403c]">Tipo de contrato</legend>
          <div className="mt-2 grid gap-2">
            <Choice
              name="tipo"
              checked={tipo === "fijo"}
              onChange={() => setTipo("fijo")}
              title="Término fijo"
              detail="Aviso de no prórroga, con al menos 30 días, según el artículo 46."
            />
            <Choice
              name="tipo"
              checked={tipo === "obra"}
              onChange={() => setTipo("obra")}
              title="Obra o labor"
              detail="Aviso de terminación porque finalizó la obra o labor contratada."
            />
            <Choice
              name="tipo"
              checked={tipo === "indefinido"}
              onChange={() => setTipo("indefinido")}
              title="Término indefinido"
              detail="Aviso de terminación del contrato, con la fecha en que termina."
            />
          </div>
        </fieldset>

        <label className="mt-5 flex flex-col gap-1.5 text-sm font-medium text-[#44403c]">
          Fecha
          <input
            type="date"
            min="1900-01-01"
            max="2099-12-31"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className={inputClass}
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-[#44403c]">Formato de la fecha</legend>
          <div className="mt-2 grid gap-2">
            <Choice
              name="formato"
              checked={formato === "hablado"}
              onChange={() => setFormato("hablado")}
              title="Como el contrato"
              detail="Día y año en letras, con el número entre paréntesis."
            />
            <Choice
              name="formato"
              checked={formato === "corto"}
              onChange={() => setFormato("corto")}
              title="Como el preaviso"
              detail="Día, mes y año en el formato corto del aviso."
            />
          </div>
        </fieldset>

        <p className="mt-4 rounded-lg bg-[#f7f4ef] px-3 py-2 text-sm leading-6 text-[#1f1a17]">
          {fechaTexto
            ? `En el preaviso: teniendo como fecha de ${tipo === "fijo" ? "vencimiento" : "terminación"} el ${fechaTexto}.`
            : "Elige una fecha válida."}
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-full px-4 text-sm font-medium text-[#57534e]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={!fechaTexto}
            className="h-11 rounded-full bg-[#9a3412] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Generar preaviso
          </button>
        </div>
      </div>
    </div>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  detail,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-3 ${
        checked ? "border-[#9a3412] bg-[#fff7ed]" : "border-[#e7e0d6] bg-white"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-[#1f1a17]">{title}</span>
        <span className="mt-0.5 block text-sm font-normal leading-5 text-[#78716c]">{detail}</span>
      </span>
    </label>
  );
}

function FieldControl({
  attribute,
  value,
  error,
  onChange,
}: {
  attribute: AttributeRecord;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const wide = attribute.tipo === "lugar_fecha" || attribute.tipo === "fecha_texto";
  return (
    <div className={`flex flex-col gap-1.5 text-sm font-medium text-[#44403c] ${wide ? "sm:col-span-2" : ""}`}>
      <span>{attribute.etiqueta}</span>
      {attribute.tipo === "fecha_texto" ? (
        <DateField value={value} invalid={Boolean(error)} onChange={onChange} />
      ) : attribute.tipo === "lugar_fecha" ? (
        <SignatureField value={value} invalid={Boolean(error)} onChange={onChange} />
      ) : (
        <input
          name={attribute.clave}
          value={value}
          inputMode={attribute.tipo === "texto" ? "text" : "numeric"}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          placeholder={attribute.tipo === "numerico" ? "1143325667" : undefined}
          onChange={(event) => onChange(formatFieldInput(attribute.tipo, event.target.value))}
          className={inputClass}
        />
      )}
      <span className="font-normal text-[#78716c]">{TYPE_HINTS[attribute.tipo]}</span>
      {showsContractPreview(attribute.tipo, value) ? <ContractPreview value={value} /> : null}
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function DateField({
  value,
  invalid,
  onChange,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      min="1900-01-01"
      max="2099-12-31"
      value={isoFromSpoken(value)}
      aria-invalid={invalid}
      onChange={(event) => onChange(spokenFromIso(event.target.value))}
      className={inputClass}
    />
  );
}

function SignatureField({
  value,
  invalid,
  onChange,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const parts = signatureParts(value);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
      <input
        value={parts.city}
        spellCheck={false}
        aria-invalid={invalid}
        placeholder="Cartagena"
        onChange={(event) => onChange(signatureFromParts(event.target.value, parts.iso))}
        className={inputClass}
      />
      <input
        type="date"
        min="1900-01-01"
        max="2099-12-31"
        value={parts.iso}
        aria-invalid={invalid}
        onChange={(event) => onChange(signatureFromParts(parts.city, event.target.value))}
        className={inputClass}
      />
    </div>
  );
}

function formatFieldInput(tipo: AttributeRecord["tipo"], raw: string): string {
  if (tipo === "numerico") return formatCedulaInput(raw);
  if (tipo === "moneda") return formatCurrencyInput(raw);
  if (tipo === "texto") return formatWordsInput(raw);
  return raw;
}

function showsContractPreview(tipo: AttributeRecord["tipo"], value: string): boolean {
  if (!value) return false;
  if (tipo === "fecha_texto") return true;
  if (tipo === "lugar_fecha") return value.includes(",");
  if (tipo === "moneda" || tipo === "numerico") return true;
  return false;
}

function ContractPreview({ value }: { value: string }) {
  return (
    <p className="rounded-lg bg-[#f7f4ef] px-3 py-2 font-normal leading-6 text-[#1f1a17]">
      En el contrato: {value}
    </p>
  );
}

const inputClass =
  "h-11 rounded-lg border border-[#d6d3d1] px-3 text-base font-normal text-[#1f1a17] placeholder:text-[#a8a29e]";

function FieldError({ message }: { message: string }) {
  return <span className="font-normal text-[#b91c1c]">{message}</span>;
}
