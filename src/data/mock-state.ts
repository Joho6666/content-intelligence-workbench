import type { WorkbenchState } from "../types";
import { mockIntelligence } from "./mock-intelligence";
import { mockInbox } from "./mock-inbox";
import { mockIdeas } from "./mock-ideas";
import { mockCompetitors } from "./mock-competitors";
import { mockContent } from "./mock-content";

export const demoState: WorkbenchState = {
  intelligence: mockIntelligence,
  inbox: mockInbox,
  ideas: mockIdeas,
  competitors: mockCompetitors,
  content: mockContent,
};
