import fs from "node:fs";
import path from "node:path";
import { fillContract } from "@/lib/fill-contract";
import { renderContractPdf } from "@/lib/contract-pdf";
import { getEmployee } from "@/lib/employees";

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

  const template = fs.readFileSync(path.join(process.cwd(), "content", "preaviso.md"), "utf8");
  const markdown = fillContract(template, employee.valores);
  const pdf = await renderContractPdf(markdown, { centerTitle: false });
  const filename = `preaviso-${slug(employee.valores.nombre_trabajador ?? "empleado")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function slug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "empleado"
  );
}
