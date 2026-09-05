import { requireAuth } from "../../../../src/server/auth/context";
import { createIntelligence, listIntelligence } from "../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../src/server/http/response";
import { intelligenceCreateSchema, listQuerySchema } from "../../../../src/server/validation/schemas";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return dataResponse(await listIntelligence(await requireAuth(), query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    return dataResponse(await createIntelligence(await requireAuth(), intelligenceCreateSchema.parse(await parseJson(request))), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
