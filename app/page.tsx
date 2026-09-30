import { StaffBoard } from "@/app/components/staff-board";
import { listEmployees, listRoles } from "@/lib/employees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const rawRole = Array.isArray(params.rol) ? params.rol[0] : params.rol;
  const selectedRoleId = rawRole && /^\d+$/.test(rawRole) ? Number(rawRole) : null;
  const roles = listRoles();
  const roleExists = roles.some((role) => role.id === selectedRoleId);
  const employees = listEmployees(roleExists ? selectedRoleId : null);

  return (
    <StaffBoard
      roles={roles}
      employees={employees}
      selectedRoleId={roleExists ? selectedRoleId : null}
    />
  );
}
