/**
 * Funny cooking-related error messages for LLM extraction failures.
 */
const COOKING_ERRORS = [
  "Our AI chef accidentally added too much salt to the code. Give it another whisk?",
  "The LLM soufflé collapsed! Let's try preheating the oven again.",
  "Oops! The digital kitchen is a bit smoky. Shall we try another batch?",
  "Our robot chef got distracted by a shiny spoon. Let's get them back to work.",
  "The recipe was so good, our AI tried to eat it instead of parsing it. One more time?",
  "Looks like we've got a literal 'spaghetti code' situation in the kitchen. Let's try to untangle it.",
  "The AI burnt the toast! Don't worry, the next batch will be better.",
  "The virtual timer went off too early. Let's put it back in the oven for a bit.",
  "Our AI chef is currently having a food fight. Let's wait for the dust to settle and try again.",
  "The secret ingredient was missing... and it was 'success'. Let's try again!",
];

/**
 * Returns a random funny cooking-related error message.
 */
export function getFunnyCookingError(): string {
  const randomIndex = Math.floor(Math.random() * COOKING_ERRORS.length);
  return COOKING_ERRORS[randomIndex];
}
