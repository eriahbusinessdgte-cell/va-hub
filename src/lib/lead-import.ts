/** Fields a CSV column can be matched to, with header names we recognise automatically. */
export const IMPORT_FIELDS = [
  { key: "name", label: "Name", synonyms: ["name", "full name", "lead", "lead name", "contact", "contact name", "prospect"] },
  { key: "first_name", label: "First name", synonyms: ["first name", "firstname", "first", "given name"] },
  { key: "last_name", label: "Last name", synonyms: ["last name", "lastname", "last", "surname", "family name"] },
  { key: "company", label: "Company", synonyms: ["company", "business", "business name", "company name", "organization", "organisation", "brand"] },
  { key: "email", label: "Email", synonyms: ["email", "e-mail", "email address", "mail"] },
  { key: "phone", label: "Phone", synonyms: ["phone", "phone number", "mobile", "cell", "telephone", "tel", "whatsapp"] },
  { key: "website", label: "Website", synonyms: ["website", "site", "url", "web", "domain"] },
  { key: "social_url", label: "Social profile", synonyms: ["social", "social media", "social profile", "instagram", "ig", "linkedin", "facebook", "profile", "handle", "tiktok"] },
  { key: "source", label: "Source", synonyms: ["source", "lead source", "channel", "platform", "where found"] },
  { key: "status", label: "Status", synonyms: ["status", "stage", "pipeline stage", "lead status"] },
  { key: "date_contacted", label: "Date contacted", synonyms: ["date contacted", "contacted", "contacted on", "last contacted", "last contact", "date reached out", "outreach date"] },
  { key: "follow_up_date", label: "Follow-up date", synonyms: ["follow up", "follow-up", "follow up date", "follow-up date", "followup", "next follow up", "next contact"] },
  { key: "next_action", label: "Next action", synonyms: ["next action", "next step", "next steps", "action", "to do", "todo"] },
  { key: "notes", label: "Notes", synonyms: ["notes", "note", "comments", "comment", "remarks", "details", "description"] },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

const norm = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

/** Guesses which field each CSV column is, by its header. Each field is used once. */
export function guessMapping(headers: string[]): (ImportFieldKey | "")[] {
  const used = new Set<string>();
  return headers.map((h) => {
    const n = norm(h);
    const exact = IMPORT_FIELDS.find((f) => !used.has(f.key) && (f.synonyms as readonly string[]).includes(n));
    const loose =
      exact ??
      IMPORT_FIELDS.find((f) => !used.has(f.key) && (f.synonyms as readonly string[]).some((s) => s.length > 3 && n.includes(s)));
    if (loose) {
      used.add(loose.key);
      return loose.key;
    }
    return "";
  });
}

/** A lead ready to send to the server (dates already parsed). */
export type ImportRow = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social_url: string | null;
  source: string | null;
  status: string | null;
  date_contacted: string | null;
  follow_up_date: string | null;
  next_action: string | null;
  notes: string | null;
};

/** The key used to spot duplicates: email if present, otherwise name + company. */
export function duplicateKey(r: { name: string; company: string | null; email: string | null }): string {
  if (r.email?.trim()) return `e:${r.email.trim().toLowerCase()}`;
  return `n:${r.name.trim().toLowerCase()}|${(r.company ?? "").trim().toLowerCase()}`;
}
