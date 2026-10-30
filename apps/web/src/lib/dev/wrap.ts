/**
 * Compact JSON in pieces that end after each comma or colon, for rendering
 * with a <wbr> between them: a long value can wrap at its punctuation, and
 * the text stays exactly the JSON, so copying it copies what was hashed.
 */
export function jsonPieces(json: string): string[] {
  return json.split(/(?<=[,:])/);
}
