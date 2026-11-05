"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp } from "lucide-react";
import { ensureStatuses, importLeadBatch } from "@/app/(app)/leads/import-actions";
import { parseCSV, parseDate } from "@/lib/csv";
import { guessMapping, IMPORT_FIELDS, type ImportFieldKey, type ImportRow } from "@/lib/lead-import";
import { cn } from "@/lib/utils";

const BATCH = 100;

export function LeadImporter({
  clientId,
  clientName,
  statusNames,
}: {
  clientId: string;
  clientName: string;
  statusNames: string[];
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(ImportFieldKey | "")[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [addStatuses, setAddStatuses] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; statuses: number; failed?: string } | null>(null);

  const headers = rows[0] ?? [];
  const body = rows.slice(1);

  const onFile = async (file: File | undefined) => {
    setError("");
    setResult(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError("That file is over 10 MB. Please split it into smaller files.");
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) return setError("That file doesn't seem to have any rows under the header line.");
    setFileName(file.name);
    setRows(parsed);
    setMapping(guessMapping(parsed[0]));
  };

  /** Converts the CSV rows into leads using the chosen mapping. */
  const prepared = useMemo(() => {
    const col = (key: ImportFieldKey) => mapping.indexOf(key);
    const get = (r: string[], key: ImportFieldKey) => {
      const i = col(key);
      const v = i >= 0 ? (r[i] ?? "").trim() : "";
      return v === "" ? null : v;
    };
    let badDates = 0;
    const out: ImportRow[] = body.map((r) => {
      const first = get(r, "first_name");
      const last = get(r, "last_name");
      const name = get(r, "name") ?? ([first, last].filter(Boolean).join(" ") || null);
      const dc = get(r, "date_contacted");
      const fu = get(r, "follow_up_date");
      const dcParsed = parseDate(dc);
      const fuParsed = parseDate(fu);
      if ((dc && !dcParsed) || (fu && !fuParsed)) badDates++;
      return {
        name: name ?? "",
        company: get(r, "company"),
        email: get(r, "email"),
        phone: get(r, "phone"),
        website: get(r, "website"),
        social_url: get(r, "social_url"),
        source: get(r, "source"),
        status: get(r, "status"),
        date_contacted: dcParsed,
        follow_up_date: fuParsed,
        next_action: get(r, "next_action"),
        notes: get(r, "notes"),
      };
    });
    const known = new Set(statusNames.map((s) => s.toLowerCase()));
    const unknownStatuses = [
      ...new Map(
        out
          .map((r) => r.status?.trim())
          .filter((s): s is string => !!s && !known.has(s.toLowerCase()))
          .map((s) => [s.toLowerCase(), s]),
      ).values(),
    ];
    const missingName = out.filter((r) => !r.name.trim()).length;
    return { out, badDates, unknownStatuses, missingName };
  }, [body, mapping, statusNames]);

  const hasNameColumn = mapping.includes("name") || mapping.includes("first_name") || mapping.includes("last_name");

  const runImport = async () => {
    setError("");
    setProgress({ done: 0, total: prepared.out.length });
    let imported = 0;
    let skipped = 0;
    let statuses = 0;
    try {
      if (addStatuses && prepared.unknownStatuses.length > 0) {
        statuses = await ensureStatuses(clientId, prepared.unknownStatuses);
      }
      for (let i = 0; i < prepared.out.length; i += BATCH) {
        const res = await importLeadBatch(clientId, prepared.out.slice(i, i + BATCH), skipDuplicates);
        imported += res.imported;
        skipped += res.skipped;
        if (res.error) {
          setResult({ imported, skipped, statuses, failed: res.error });
          setProgress(null);
          return;
        }
        setProgress({ done: Math.min(i + BATCH, prepared.out.length), total: prepared.out.length });
      }
      setResult({ imported, skipped, statuses });
    } catch {
      setResult({ imported, skipped, statuses, failed: "The import stopped part-way (connection problem?). Leads imported so far are saved; re-run with “skip duplicates” on to finish." });
    }
    setProgress(null);
  };

  // ---------- Finished ----------
  if (result) {
    return (
      <div className="max-w-xl rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2">
          {result.failed ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
          <h3 className="text-base font-semibold">{result.failed ? "Import partly finished" : "Import complete"}</h3>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          <li><strong>{result.imported}</strong> lead{result.imported === 1 ? "" : "s"} added to {clientName}</li>
          {result.skipped > 0 && <li className="text-ink-muted">{result.skipped} skipped (duplicates or rows without a name)</li>}
          {result.statuses > 0 && <li className="text-ink-muted">{result.statuses} new pipeline stage{result.statuses === 1 ? "" : "s"} added</li>}
        </ul>
        {result.failed && <p className="mt-3 text-sm text-danger">{result.failed}</p>}
        <div className="mt-5 flex gap-2">
          <Link href={`/clients/${clientId}/leads`} className="btn-primary">View leads</Link>
          <button
            onClick={() => {
              setResult(null);
              setRows([]);
              setFileName("");
            }}
            className="btn-ghost"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  // ---------- Choose file ----------
  if (rows.length === 0) {
    return (
      <div className="max-w-xl space-y-4">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-surface px-6 py-14 text-center transition hover:border-ink-faint"
        >
          <FileUp className="mb-3 h-7 w-7 text-ink-faint" />
          <span className="text-sm font-medium">Choose a CSV file, or drag it here</span>
          <span className="mt-1 text-[13px] text-ink-muted">
            From Google Sheets: File → Download → CSV. From Excel: Save As → CSV.
          </span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <a href="/api/export/template" className="btn-ghost -ml-2 text-[13px]">
          <Download className="h-3.5 w-3.5" /> Download a template CSV
        </a>
      </div>
    );
  }

  // ---------- Match columns & preview ----------
  const previewRows = body.slice(0, 5);
  const willImport = prepared.out.length - prepared.missingName;

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink-muted">
        <strong className="text-ink">{fileName}</strong> · {body.length} row{body.length === 1 ? "" : "s"}
        <button onClick={() => setRows([])} className="ml-3 text-accent hover:underline">Choose a different file</button>
      </div>

      <section>
        <h3 className="mb-1 text-[15px] font-semibold">1. Match your columns</h3>
        <p className="mb-3 text-[13px] text-ink-muted">
          We matched what we could. Pick &ldquo;Don&apos;t import&rdquo; for columns you don&apos;t need.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-line">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="min-w-[160px] px-3 py-2.5 align-top font-normal">
                    <p className="mb-1.5 truncate text-[12px] text-ink-faint">{h || `Column ${i + 1}`}</p>
                    <select
                      value={mapping[i] ?? ""}
                      onChange={(e) => {
                        const next = [...mapping];
                        const val = e.target.value as ImportFieldKey | "";
                        // A field can only be used once
                        if (val) next.forEach((m, j) => m === val && (next[j] = ""));
                        next[i] = val;
                        setMapping(next);
                      }}
                      className={cn("input py-1 text-[13px]", mapping[i] ? "font-medium" : "text-ink-faint")}
                    >
                      <option value="">Don&apos;t import</option>
                      {IMPORT_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-muted">
              {previewRows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci} className={cn("max-w-[220px] truncate px-3 py-2", !mapping[ci] && "text-ink-faint/60")}>
                      {r[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {body.length > 5 && <p className="mt-1.5 text-[12px] text-ink-faint">Showing the first 5 rows.</p>}
      </section>

      <section className="max-w-2xl space-y-3">
        <h3 className="text-[15px] font-semibold">2. Check and import</h3>

        {!hasNameColumn && (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Match one column to <strong>Name</strong> (or First name / Last name). Every lead needs a name.
          </p>
        )}
        {hasNameColumn && prepared.missingName > 0 && (
          <p className="text-[13px] text-warning">{prepared.missingName} row(s) have no name and will be skipped.</p>
        )}
        {prepared.badDates > 0 && (
          <p className="text-[13px] text-warning">
            {prepared.badDates} row(s) have a date we couldn&apos;t read. Those dates will be left empty. (Best format: 2026-11-05 or 11/05/2026.)
          </p>
        )}
        {prepared.unknownStatuses.length > 0 && (
          <label className="flex items-start gap-2.5 text-[13px]">
            <input type="checkbox" checked={addStatuses} onChange={(e) => setAddStatuses(e.target.checked)} className="mt-0.5" />
            <span>
              Add these statuses to {clientName}&apos;s pipeline:{" "}
              <strong>{prepared.unknownStatuses.join(", ")}</strong>
              <span className="block text-ink-muted">If unticked, those leads go into the first stage instead.</span>
            </span>
          </label>
        )}
        <label className="flex items-start gap-2.5 text-[13px]">
          <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="mt-0.5" />
          <span>
            Skip duplicates
            <span className="block text-ink-muted">Leads with the same email (or same name and company) as one already in {clientName}, or earlier in this file.</span>
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={runImport} disabled={!hasNameColumn || willImport === 0 || !!progress} className="btn-primary">
            {progress ? `Importing… ${progress.done}/${progress.total}` : `Import ${willImport} lead${willImport === 1 ? "" : "s"}`}
          </button>
          <Link href={`/clients/${clientId}/leads`} className="btn-ghost">Cancel</Link>
        </div>
      </section>
    </div>
  );
}
