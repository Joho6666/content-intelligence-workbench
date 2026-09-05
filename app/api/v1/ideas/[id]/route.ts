import { requireAuth } from "../../../../../src/server/auth/context";
import { deleteIdea, getIdea, updateIdea } from "../../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../../src/server/http/response";
import { ideaUpdateSchema } from "../../../../../src/server/validation/schemas";
import { parseId } from "../../../../../src/server/http/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    return dataResponse(await getIdea(await requireAuth(), parseId((await params).id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    return dataResponse(await updateIdea(await requireAuth(), parseId((await params).id), ideaUpdateSchema.parse(await parseJson(request))));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await deleteIdea(await requireAuth(), parseId((await params).id));
    return dataResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
