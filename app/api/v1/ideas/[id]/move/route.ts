import { requireAuth } from "../../../../../../src/server/auth/context";
import { moveIdea } from "../../../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../../../src/server/http/response";
import { moveIdeaSchema } from "../../../../../../src/server/validation/schemas";
import { parseId } from "../../../../../../src/server/http/route-utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const input = moveIdeaSchema.parse(await parseJson(request));
    return dataResponse(await moveIdea(await requireAuth(), parseId((await params).id), input.status, input.before_id));
  } catch (error) {
    return errorResponse(error);
  }
}
