import { fillContract } from "@/lib/fill-contract";
import { renderContractPdf } from "@/lib/contract-pdf";
import { getContract, getEmployee } from "@/lib/employees";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Empleado no válido." }, { status: 400 });
  }

  const employee = getEmployee(Number(id));
  if (!employee) {
    return Response.json({ error: "No se encontró el empleado." }, { status: 404 });
  }

  const contract = getContract(employee.rolId);
  if (!contract) {
    return Response.json({ error: "Este rol no tiene un contrato." }, { status: 404 });
  }

  const markdown = fillContract(contract.contenidoMd, employee.valores);
  const pdf = await renderContractPdf(markdown);
  const filename = `contrato-${slug(employee.valores.nombre_trabajador ?? "empleado")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "empleado";
}
