import { requireAuth } from "../../../../src/server/auth/context";
import { createContent, listContent } from "../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../src/server/http/response";
import { contentCreateSchema, listQuerySchema } from "../../../../src/server/validation/schemas";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return dataResponse(await listContent(await requireAuth(), query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    return dataResponse(await createContent(await requireAuth(), contentCreateSchema.parse(await parseJson(request))), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
