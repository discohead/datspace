import { tools } from "@datspace/contract";

export function load() {
  return { tools: tools.map(({ name, description }) => ({ name, description })) };
}
