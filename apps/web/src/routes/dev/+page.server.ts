import { API_VERSION } from "@datspace/contract";
import { answerabilityCases, contract, history } from "#lib/dev/repo.server.ts";

export function load() {
  return { apiVersion: API_VERSION, tools: contract(), cases: answerabilityCases(), ...history() };
}
