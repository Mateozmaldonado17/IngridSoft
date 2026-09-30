"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteEmployeeAction, saveEmployeeAction } from "@/app/actions";
import { TYPE_HINTS, validateValues } from "@/lib/contract-fields";
import type { EmployeeRecord, RoleRecord } from "@/lib/staff-types";

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
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [pending, setPending] = useState(false);

  const selectedRole = roles.find((role) => role.id === rolId) ?? null;
  const editing = employees.find((employee) => employee.id === editingId) ?? null;

  const roleSummary = useMemo(
    () => roles.map((role) => ({ id: role.id, nombre: role.nombre })),
    [roles],
  );

  function selectRole(nextRoleId: number | "") {
    setRolId(nextRoleId);
    setErrores({});
    setBanner("");
  }

  function beginEdit(employee: EmployeeRecord) {
    setEditingId(employee.id);
    setRolId(employee.rolId);
    setValores({ ...employee.valores });
    setErrores({});
    setBanner("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setRolId("");
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
        {selectedRole ? (
          <p className="mt-3 text-sm leading-6 text-[#57534e]">{selectedRole.descripcion}</p>
        ) : null}

        {selectedRole ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {selectedRole.atributos.map((attribute) => (
              <label
                key={attribute.clave}
                className={`flex flex-col gap-1.5 text-sm font-medium text-[#44403c] ${
                  attribute.tipo === "lugar_fecha" || attribute.tipo === "fecha_texto"
                    ? "sm:col-span-2"
                    : ""
                }`}
              >
                {attribute.etiqueta}
                <input
                  name={attribute.clave}
                  value={valores[attribute.clave] ?? ""}
                  placeholder={attribute.ejemplo}
                  spellCheck={false}
                  aria-invalid={Boolean(errores[attribute.clave])}
                  onChange={(event) => {
                    const clave = attribute.clave;
                    setValores((current) => ({
                      ...current,
                      [clave]: event.target.value,
                    }));
                    setErrores((current) => {
                      if (!current[clave]) return current;
                      const next = { ...current };
                      delete next[clave];
                      return next;
                    });
                  }}
                  className="h-11 rounded-lg border border-[#d6d3d1] px-3 text-base font-normal text-[#1f1a17] placeholder:text-[#a8a29e]"
                />
                <span className="font-normal text-[#78716c]">
                  {TYPE_HINTS[attribute.tipo]} Ejemplo: {attribute.ejemplo}.
                </span>
                {errores[attribute.clave] ? <FieldError message={errores[attribute.clave]} /> : null}
              </label>
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
                    <td className="px-4 py-3 font-medium text-[#1f1a17]">{employee.rolNombre}</td>
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
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="font-normal text-[#b91c1c]">{message}</span>;
}
