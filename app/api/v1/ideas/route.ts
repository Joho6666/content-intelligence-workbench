import { requireAuth } from "../../../../src/server/auth/context";
import { createIdea, listIdeas } from "../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../src/server/http/response";
import { ideaCreateSchema, listQuerySchema } from "../../../../src/server/validation/schemas";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return dataResponse(await listIdeas(await requireAuth(), query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    return dataResponse(await createIdea(await requireAuth(), ideaCreateSchema.parse(await parseJson(request))), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
