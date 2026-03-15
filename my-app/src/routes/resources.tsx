import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { BookOpen, Download, FileText, Link2, Search, Trash2, Upload } from 'lucide-react'
import { useAuthStore } from '../lib/auth'
import {
  downloadStudyResource,
  useDeleteStudyResource,
  useImportYouTubeStudyResource,
  useMyStudyResources,
  useSemanticStudySearch,
  useStudyResourcesBySubject,
  useUploadStudyResource,
} from '../lib/hooks'

export const Route = createFileRoute('/resources')({
  component: StudyResourcesPage,
})

const YOUTUBE_PROCESSING_NOTE = 'YouTube resource uploaded. Embedding is processing in background.'

function toErrorMessage(error: any): string {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && typeof first.msg === 'string') return first.msg
  }
  if (detail && typeof detail === 'object' && typeof detail.msg === 'string') return detail.msg

  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return 'Upload failed.'
}

function StudyResourcesPage() {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return (
      <main className="page-wrap px-4 py-10">
        <div className="island-shell rounded-2xl p-6 text-center text-[var(--sea-ink-soft)]">
          Please sign in to access Study Resources.
        </div>
      </main>
    )
  }

  const isTeacher = user.role === 'advisor' || user.role === 'admin'
  return isTeacher ? <TeacherResourcesView /> : <StudentResourcesView />
}

function TeacherResourcesView() {
  const teacherId = useAuthStore((state) => state.user?.id)
  const uploadMutation = useUploadStudyResource()
  const importYoutubeMutation = useImportYouTubeStudyResource()
  const deleteMutation = useDeleteStudyResource()
  const { data: resources = [], isLoading } = useMyStudyResources()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeSubject, setYoutubeSubject] = useState('')
  const [message, setMessage] = useState('')

  const onUpload = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (!file) {
      setMessage('Please choose a file.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('subject', subject)
    formData.append('description', description)
    formData.append('tags', tags)
    if (teacherId) formData.append('teacher_id', String(teacherId))
    try {
      await uploadMutation.mutateAsync(formData)
      setTitle('')
      setSubject('')
      setDescription('')
      setTags('')
      setFile(null)
      setMessage('Resource uploaded successfully.')
    } catch (error: any) {
      setMessage(toErrorMessage(error))
    }
  }

  const onDownload = async (resourceId: number, filename: string) => {
    const blob = await downloadStudyResource(resourceId)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const onImportYoutube = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (!youtubeUrl.trim()) {
      setMessage('Please enter a YouTube video or playlist URL.')
      return
    }

    if (!youtubeSubject.trim()) {
      setMessage('Please enter subject for YouTube resource.')
      return
    }

    try {
      const result = await importYoutubeMutation.mutateAsync({
        url: youtubeUrl.trim(),
        subject: youtubeSubject.trim(),
      })
      setYoutubeUrl('')
      setYoutubeSubject('')
      if (result.status === 'queued') {
        setMessage('YouTube import queued for background processing.')
      } else {
        setMessage(
          `YouTube import completed. Indexed ${result.indexed_videos}/${result.total_videos} video(s).`
        )
      }
    } catch (error: any) {
      setMessage(toErrorMessage(error))
    }
  }

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <p className="island-kicker mb-1">Teacher Portal</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">Study Resources Manager</h1>
      </section>

      <form onSubmit={onUpload} className="island-shell space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Upload Study Resource</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            required
          />
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            required
          />
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma separated)"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 sm:col-span-2"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="min-h-24 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 sm:col-span-2"
          />
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="sm:col-span-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--lagoon-deep)] bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Resource'}
        </button>

        {message && <p className="text-sm text-[var(--sea-ink-soft)]">{message}</p>}
      </form>

      <form onSubmit={onImportYoutube} className="island-shell space-y-4 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-[var(--sea-ink)]">Import YouTube Resource</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="YouTube video or playlist URL"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 sm:col-span-2"
            required
          />
          <input
            value={youtubeSubject}
            onChange={(event) => setYoutubeSubject(event.target.value)}
            placeholder="Subject"
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 sm:col-span-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={importYoutubeMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--lagoon-deep)] bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] disabled:opacity-60"
        >
          <Link2 className="h-4 w-4" />
          {importYoutubeMutation.isPending ? 'Importing...' : 'Import YouTube'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--sea-ink)]">My Uploaded Resources</h2>

        {isLoading ? (
          <p className="text-[var(--sea-ink-soft)]">Loading resources...</p>
        ) : resources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-5 text-[var(--sea-ink-soft)]">
            No resources uploaded yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resources.map((resource) => (
              <div key={resource.id} className="island-shell space-y-2 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--sea-ink)]">{resource.title}</p>
                    <p className="text-xs text-[var(--sea-ink-soft)]">{resource.subject}</p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(resource.id)}
                    title="Delete resource"
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {resource.description && resource.description !== YOUTUBE_PROCESSING_NOTE && (
                  <p className="text-sm text-[var(--sea-ink-soft)]">{resource.description}</p>
                )}

                {resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--line)] bg-[var(--island-bg)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-1">
                  {resource.file_type.toLowerCase() === 'youtube' ? (
                    <button
                      onClick={() => window.open(resource.file_url, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                    >
                      <FileText className="h-3 w-3" /> Open Video
                    </button>
                  ) : (
                    <button
                      onClick={() => onDownload(resource.id, resource.title)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function StudentResourcesView() {
  const [subject, setSubject] = useState('all')
  const [query, setQuery] = useState('')
  const [resourceType, setResourceType] = useState<'all' | 'pdf' | 'docx' | 'youtube'>('all')

  const { data: allResources = [], isLoading: loadingAll } = useStudyResourcesBySubject('all')
  const { data: bySubject = [], isLoading: loadingSubject } = useStudyResourcesBySubject(subject)
  const { data: semanticResults = [], isFetching: searching } = useSemanticStudySearch(query, subject)

  const subjects = useMemo(() => {
    const values = new Set(allResources.map((item) => item.subject))
    return ['all', ...Array.from(values)]
  }, [allResources])

  const showSearch = query.trim().length >= 2

  const filteredSemanticResults = useMemo(() => {
    if (resourceType === 'all') return semanticResults
    return semanticResults.filter((resource) => {
      const normalizedType = (resource.file_type || resource.source || '').toLowerCase()
      return normalizedType === resourceType
    })
  }, [semanticResults, resourceType])

  const filteredBySubject = useMemo(() => {
    if (resourceType === 'all') return bySubject
    return bySubject.filter((resource) => resource.file_type.toLowerCase() === resourceType)
  }, [bySubject, resourceType])

  const onDownload = async (resourceId: number, filename: string, openInNewTab = false) => {
    const blob = await downloadStudyResource(resourceId)
    const url = URL.createObjectURL(blob)

    if (openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      return
    }

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <p className="island-kicker mb-1">Student</p>
        <h1 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">Study Resources</h1>
      </section>

      <div className="island-shell grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Semantic search (e.g., recursion basics notes)"
            className="w-full rounded-xl border border-[var(--line)] bg-transparent py-2 pl-9 pr-3"
          />
        </div>
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
        >
          {subjects.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All Subjects' : value}
            </option>
          ))}
        </select>
        <select
          value={resourceType}
          onChange={(event) => setResourceType(event.target.value as 'all' | 'pdf' | 'docx' | 'youtube')}
          className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>

      {(loadingAll || loadingSubject) && <p className="text-[var(--sea-ink-soft)]">Loading resources...</p>}

      {showSearch ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--sea-ink)]">Semantic Search Results</h2>

          {searching ? (
            <p className="text-[var(--sea-ink-soft)]">Searching...</p>
          ) : filteredSemanticResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] p-5 text-[var(--sea-ink-soft)]">
              No matching resources found.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredSemanticResults.map((resource) => (
                <div key={`${resource.source ?? 'resource'}-${resource.video_id ?? resource.resource_id}-${resource.timestamp ?? 0}`} className="island-shell space-y-2 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--sea-ink)]">{resource.title}</p>
                      <p className="text-xs text-[var(--sea-ink-soft)]">{resource.subject}</p>
                    </div>
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
                      {(resource.similarity_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {resource.description && resource.description !== YOUTUBE_PROCESSING_NOTE && (
                    <p className="text-sm text-[var(--sea-ink-soft)]">{resource.description}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    {resource.source === 'youtube' ? (
                      <button
                        onClick={() => window.open(resource.file_url, '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                      >
                        <FileText className="h-3 w-3" /> Open Video
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onDownload(resource.resource_id, resource.title, true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                        >
                          <FileText className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => onDownload(resource.resource_id, resource.title)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[var(--sea-ink)]">Resources by Subject</h2>

          {filteredBySubject.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] p-5 text-[var(--sea-ink-soft)]">
              No resources available for this subject.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredBySubject.map((resource) => (
                <div key={resource.id} className="island-shell space-y-2 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--sea-ink)]">{resource.title}</p>
                      <p className="text-xs text-[var(--sea-ink-soft)]">{resource.subject}</p>
                    </div>
                    <BookOpen className="h-4 w-4 text-[var(--sea-ink-soft)]" />
                  </div>

                  {resource.description && resource.description !== YOUTUBE_PROCESSING_NOTE && (
                    <p className="text-sm text-[var(--sea-ink-soft)]">{resource.description}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    {resource.file_type.toLowerCase() === 'youtube' ? (
                      <button
                        onClick={() => window.open(resource.file_url, '_blank', 'noopener,noreferrer')}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                      >
                        <FileText className="h-3 w-3" /> Open Video
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onDownload(resource.id, resource.title, true)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                        >
                          <FileText className="h-3 w-3" /> View
                        </button>
                        <button
                          onClick={() => onDownload(resource.id, resource.title)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--island-bg)]"
                        >
                          <Download className="h-3 w-3" /> Download
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
