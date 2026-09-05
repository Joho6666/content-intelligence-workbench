import { requireAuth } from "../../../../src/server/auth/context";
import { createInbox, listInbox } from "../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse, parseJson } from "../../../../src/server/http/response";
import { inboxCreateSchema, listQuerySchema } from "../../../../src/server/validation/schemas";

export async function GET(request: Request) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    return dataResponse({ ...(await listInbox(await requireAuth(), query)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = inboxCreateSchema.parse(await parseJson(request));
    return dataResponse(await createInbox(await requireAuth(), input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
