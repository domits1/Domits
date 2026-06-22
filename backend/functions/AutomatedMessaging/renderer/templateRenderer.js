import { APPROVED_VARIABLES } from "../util/constants.js";
import { badRequest } from "../util/httpErrors.js";

const APPROVED_VARIABLE_SET = new Set(APPROVED_VARIABLES);

const normalizeValue = (value) => String(value ?? "").replaceAll("\0", "");

const scanTemplate = (template) => {
  const text = String(template || "");
  const variables = [];
  const seenVariables = new Set();
  const tokens = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.startsWith("}}", cursor)) {
      throw badRequest("Message template contains malformed variable braces.");
    }
    if (!text.startsWith("{{", cursor)) {
      cursor += 1;
      continue;
    }

    const start = cursor;
    cursor += 2;
    const contentStart = cursor;
    while (cursor < text.length && !text.startsWith("}}", cursor)) {
      if (text[cursor] === "{" || text[cursor] === "}") {
        throw badRequest("Message template contains nested or malformed variable braces.");
      }
      cursor += 1;
    }
    if (cursor >= text.length) {
      throw badRequest("Message template contains an unclosed variable.");
    }

    const variable = text.slice(contentStart, cursor).trim();
    if (!variable) throw badRequest("Message template contains an empty variable.");
    const end = cursor + 2;
    tokens.push({ start, end, variable });
    if (!seenVariables.has(variable)) {
      seenVariables.add(variable);
      variables.push(variable);
    }
    cursor = end;
  }

  return { text, tokens, variables };
};

export const getTemplateVariables = (template) => scanTemplate(template).variables;

export const validateTemplate = (template) => {
  const normalized = String(template || "").trim();
  if (!normalized) throw badRequest("Message template is required.");

  const { tokens, variables } = scanTemplate(normalized);
  const unknownVariables = variables.filter((variable) => !APPROVED_VARIABLE_SET.has(variable));
  if (unknownVariables.length) {
    throw badRequest("Template contains unsupported variables.", { unknownVariables, approvedVariables: APPROVED_VARIABLES });
  }

  return { template: normalized, tokens, variables };
};

export const renderTemplate = (template, values, { missingPolicy = "error" } = {}) => {
  const validation = validateTemplate(template);
  const missingVariables = validation.variables.filter((variable) => !normalizeValue(values?.[variable]).trim());

  if (missingVariables.length && missingPolicy === "error") {
    throw badRequest("Template values are missing.", { missingVariables });
  }

  const renderedParts = [];
  let cursor = 0;
  for (const token of validation.tokens) {
    renderedParts.push(validation.template.slice(cursor, token.start));
    const value = normalizeValue(values?.[token.variable]);
    renderedParts.push(value.trim() ? value : `[Missing: ${token.variable}]`);
    cursor = token.end;
  }
  renderedParts.push(validation.template.slice(cursor));
  const renderedContent = renderedParts.join("");

  return { renderedContent, missingVariables, variables: validation.variables };
};
