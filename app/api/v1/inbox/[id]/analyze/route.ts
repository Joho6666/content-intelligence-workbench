import { requireAuth } from "../../../../../../src/server/auth/context";
import { analyzeSource } from "../../../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../../../src/server/http/response";
import { emptyBodySchema } from "../../../../../../src/server/validation/schemas";
import { parseId } from "../../../../../../src/server/http/route-utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    emptyBodySchema.parse(await parseJson(_request));
    return dataResponse(await analyzeSource(await requireAuth(), "inbox", parseId((await params).id)));
  } catch (error) {
    return errorResponse(error);
  }
}
