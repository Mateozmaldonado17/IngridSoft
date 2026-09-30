"use server";

import { revalidatePath } from "next/cache";
import { deleteEmployee, saveEmployee, type SaveResult } from "@/lib/employees";

export async function saveEmployeeAction(input: {
  usuarioId: number | null;
  rolId: number;
  valores: Record<string, string>;
}): Promise<SaveResult> {
  const result = saveEmployee(input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteEmployeeAction(usuarioId: number): Promise<SaveResult> {
  const result = deleteEmployee(usuarioId);
  if (result.ok) revalidatePath("/");
  return result;
}
