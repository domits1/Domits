import { APPROVED_VARIABLES } from "../util/constants.js";
import { badRequest } from "../util/httpErrors.js";

const APPROVED_VARIABLE_SET = new Set(APPROVED_VARIABLES);
const VARIABLE_PATTERN = /{{\s*([^{}]+?)\s*}}/g;

const normalizeValue = (value) => String(value ?? "").replaceAll("\0", "");

export const getTemplateVariables = (template) => {
  const variables = [];
  for (const match of String(template || "").matchAll(VARIABLE_PATTERN)) {
    const variable = String(match[1] || "").trim();
    if (variable && !variables.includes(variable)) variables.push(variable);
  }
  return variables;
};

export const validateTemplate = (template) => {
  const normalized = String(template || "").trim();
  if (!normalized) throw badRequest("Message template is required.");

  const variables = getTemplateVariables(normalized);
  const unknownVariables = variables.filter((variable) => !APPROVED_VARIABLE_SET.has(variable));
  if (unknownVariables.length) {
    throw badRequest("Template contains unsupported variables.", { unknownVariables, approvedVariables: APPROVED_VARIABLES });
  }

  return { template: normalized, variables };
};

export const renderTemplate = (template, values, { missingPolicy = "error" } = {}) => {
  const validation = validateTemplate(template);
  const missingVariables = validation.variables.filter((variable) => !normalizeValue(values?.[variable]).trim());

  if (missingVariables.length && missingPolicy === "error") {
    throw badRequest("Template values are missing.", { missingVariables });
  }

  const renderedContent = validation.template.replace(VARIABLE_PATTERN, (_match, rawVariable) => {
    const variable = String(rawVariable || "").trim();
    const value = normalizeValue(values?.[variable]);
    return value.trim() ? value : `[Missing: ${variable}]`;
  });

  return { renderedContent, missingVariables, variables: validation.variables };
};
