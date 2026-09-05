import { requireAuth } from "../../../../../src/server/auth/context";
import { deleteInbox, getInbox, updateInbox } from "../../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../../src/server/http/response";
import { inboxUpdateSchema } from "../../../../../src/server/validation/schemas";
import { parseId } from "../../../../../src/server/http/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const id = parseId((await params).id);
    return dataResponse(await getInbox(await requireAuth(), id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const input = inboxUpdateSchema.parse(await parseJson(request));
    return dataResponse(await updateInbox(await requireAuth(), parseId((await params).id), input));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await deleteInbox(await requireAuth(), parseId((await params).id));
    return dataResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
