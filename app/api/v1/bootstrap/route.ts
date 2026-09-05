import { requireAuth } from "../../../../src/server/auth/context";
import { bootstrap } from "../../../../src/server/services/workbench-service";
import { dataResponse, errorResponse } from "../../../../src/server/http/response";

export async function GET() {
  try {
    return dataResponse(await bootstrap(await requireAuth()));
  } catch (error) {
    return errorResponse(error);
  }
}
