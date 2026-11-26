'use client'

import { AlertTriangle, FileText, Paperclip, X } from 'lucide-react'
import { useIntake } from '@/app/intake/provider'

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const fileTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt,.csv'

/** Files stay in the browser until dispatch; the manifest is a pre-upload preview. */
export function FileManifest() {
  const { files, brief, selectFiles, removeFile } = useIntake()
  const total = files.reduce((sum, item) => sum + item.size, 0)
  const wantsDataset = /\b(data[\s-]?set|csv|spreadsheet|xlsx?|raw data)\b/i.test(brief)
  const wantsRubric = /\b(rubric|marking scheme|grading criteria|assessment criteria)\b/i.test(brief)
  const missingDataset = wantsDataset && !files.some((item) => /\b(data|dataset|csv|xlsx?|sheet|raw)\b/i.test(item.name))
  const missingRubric = wantsRubric && !files.some((item) => /rubric|mark|criteria|scheme/i.test(item.name))

  return (
    <section aria-labelledby="file-manifest-title" className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.16)] bg-[#060b14]/50 p-5">
      <p id="file-manifest-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-300"><Paperclip className="size-3.5" /> Files &amp; attachments</p>
      <label htmlFor="intake-attachment" className="mt-3 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(0,240,255,0.2)] bg-white/[.03] p-6 text-center text-sm text-slate-400 transition hover:border-cyan-300/50">
        <Paperclip className="size-5 text-cyan-300" />
        <span>{files.length ? 'Add more source material, dataset, or code files' : 'Attach source material, dataset, or code files'}</span>
        <span className="text-xs text-slate-600">Up to 15 MB per file · PDF, DOCX, ZIP, images · uploaded securely when you submit</span>
        <input id="intake-attachment" type="file" multiple accept={fileTypes} className="sr-only" onChange={(event) => {
          selectFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }} />
      </label>

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10">
          {files.map((item, index) => (
            <li key={`${item.name}-${item.lastModified}`} className="flex items-center gap-3 px-3 py-2.5 text-xs">
              <FileText className="size-3.5 shrink-0 text-cyan-300/70" />
              <span className="min-w-0 flex-1 truncate text-slate-200">{item.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-slate-500">{formatFileSize(item.size)}</span>
              <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${item.name}`} className="portal-focus shrink-0 rounded p-1 text-slate-500 transition hover:text-rose-300"><X className="size-3.5" /></button>
            </li>
          ))}
          <li className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-slate-400"><span>{files.length} file{files.length === 1 ? '' : 's'} queued</span><span className="font-mono text-cyan-200">Total {formatFileSize(total)}</span></li>
        </ul>
      )}

      {(missingDataset || missingRubric) && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[.07] px-3 py-2.5 text-[11px] leading-5 text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {missingDataset && missingRubric
            ? 'Your brief mentions a dataset and a rubric, but no matching file is attached. Add them above if the specialist should review them.'
            : `Your brief mentions a ${missingDataset ? 'dataset' : 'rubric'}, but no matching file is attached. Add it above if the specialist should review it.`}
        </p>
      )}
      <p className="mt-3 text-[10px] text-slate-600">Nothing is uploaded until you submit the brief. Oversized files are skipped automatically.</p>
    </section>
  )
}
