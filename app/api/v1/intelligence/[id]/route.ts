import { requireAuth } from "../../../../../src/server/auth/context";
import { deleteIntelligence, getIntelligence, updateIntelligence } from "../../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../../src/server/http/response";
import { intelligenceUpdateSchema } from "../../../../../src/server/validation/schemas";
import { parseId } from "../../../../../src/server/http/route-utils";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    return dataResponse(await getIntelligence(await requireAuth(), parseId((await params).id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    return dataResponse(await updateIntelligence(await requireAuth(), parseId((await params).id), intelligenceUpdateSchema.parse(await parseJson(request))));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await deleteIntelligence(await requireAuth(), parseId((await params).id));
    return dataResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
