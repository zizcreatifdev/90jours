import DOMPurify from "dompurify";

// Config for contract/attestation HTML fragments.
// Allows <style> blocks (premium contract CSS) while blocking all XSS vectors
// (script tags, javascript: URLs, on* event handlers, etc.).
// class, id, href, style attributes are in DOMPurify's default allowed list.
const CONTRACT_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_TAGS: ["style"],
  FORCE_BODY: false,
};

export const sanitizeContractHtml = (html: string): string =>
  DOMPurify.sanitize(html, CONTRACT_CONFIG) as string;
