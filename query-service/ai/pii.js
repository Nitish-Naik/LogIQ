// Simple PII redaction utilities
export function redactText(input) {
  if (!input || typeof input !== 'string') return input;

  let out = input;

  // redact emails
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');

  // redact IPv4
  out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');

  // redact simple auth tokens like idl_sk_xxx
  out = out.replace(/idl_sk_[A-Za-z0-9_-]{10,}/g, '[REDACTED_API_KEY]');

  // redact credit card-like numbers (13-19 digits)
  out = out.replace(/\b\d{13,19}\b/g, '[REDACTED_NUMBER]');

  return out;
}

export function redactObject(obj) {
  try {
    const s = JSON.stringify(obj);
    return redactText(s);
  } catch (e) {
    return obj;
  }
}
