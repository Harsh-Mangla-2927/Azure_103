import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SectionDivider } from '../components/ui/SectionDivider';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: string): string {
  try { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

export default function Resume() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [showExtracted, setShowExtracted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const { resumes } = await api.resume.list();
      setResumes(resumes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExts = ['.pdf', '.docx', '.doc'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must not exceed 5 MB.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      const result = await api.resume.upload(formData);
      setResumes([result.resume]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this resume?')) return;
    try {
      await api.resume.delete(id);
      setResumes([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const currentResume = resumes[0];

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <div className="label-deco mb-1">Manage your placement resume</div>
        <h1 className="font-heading text-xl text-foreground tracking-wide">RESUME</h1>
      </div>

      <SectionDivider />

      {error && (
        <div className="flex items-center gap-2 p-3 border border-red-800/50 bg-red-900/10 text-red-400 text-xs">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-muted hover:text-foreground"><RefreshCw size={11} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload area */}
        <div className="deco-card deco-corners p-4">
          <div className="label-deco mb-4">Upload Resume</div>

          {uploading ? (
            <div className="py-8">
              <LoadingState message="Processing resume..." />
            </div>
          ) : (
            <div
              className={`drop-zone p-8 flex flex-col items-center justify-center gap-3 text-center ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload resume file"
              onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            >
              <div className="diamond-icon text-gold">
                <Upload size={20} />
              </div>
              <div>
                <div className="heading-sm text-foreground text-[11px] mb-1">DROP YOUR RESUME HERE</div>
                <div className="text-muted text-xs">or click to browse</div>
              </div>
              <div className="flex gap-2">
                <StatusBadge variant="muted">PDF</StatusBadge>
                <StatusBadge variant="muted">DOCX</StatusBadge>
                <StatusBadge variant="muted">Max 5 MB</StatusBadge>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            aria-label="Resume file input"
          />

          {currentResume && !uploading && (
            <div className="mt-3 p-3 border border-[#1E1E1E] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-foreground text-xs font-semibold truncate">{currentResume.originalName}</div>
                  <div className="text-muted text-[10px]">{formatDate(currentResume.uploadDate)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <StatusBadge variant="green">Uploaded</StatusBadge>
                <button
                  onClick={() => handleDelete(currentResume.id)}
                  className="btn-danger !px-2 !py-1.5 !min-h-0 ml-1"
                  aria-label="Delete resume"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resume info */}
        <div className="deco-card deco-corners p-4">
          <div className="label-deco mb-4">Resume Profile</div>

          {loading ? (
            <LoadingState size="sm" message="Loading..." />
          ) : !currentResume ? (
            <div className="py-8 text-center">
              <div className="diamond-icon mx-auto mb-3 opacity-30"><FileText size={20} /></div>
              <p className="text-muted text-xs">No resume uploaded yet. Upload a PDF or DOCX file to see extracted information.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-[#1E1E1E] p-2.5">
                  <div className="label-deco mb-1">File Type</div>
                  <div className="text-foreground text-xs">{currentResume.fileType?.includes('pdf') ? 'PDF' : 'DOCX'}</div>
                </div>
                <div className="border border-[#1E1E1E] p-2.5">
                  <div className="label-deco mb-1">File Size</div>
                  <div className="text-foreground text-xs">{formatBytes(currentResume.fileSize)}</div>
                </div>
                <div className="border border-[#1E1E1E] p-2.5 col-span-2">
                  <div className="label-deco mb-1">Uploaded</div>
                  <div className="text-foreground text-xs">{formatDate(currentResume.uploadDate)}</div>
                </div>
                <div className="border border-[#1E1E1E] p-2.5 col-span-2">
                  <div className="label-deco mb-1">Extraction Status</div>
                  <div className="flex items-center gap-1">
                    {currentResume.extractedText ? (
                      <StatusBadge variant="green" dot>Text extracted</StatusBadge>
                    ) : (
                      <StatusBadge variant="red" dot>Extraction unavailable</StatusBadge>
                    )}
                  </div>
                </div>
              </div>

              {currentResume.extractedText && (
                <>
                  <button
                    onClick={() => setShowExtracted(s => !s)}
                    className="btn-ghost !text-xs !py-2 w-full"
                  >
                    {showExtracted ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showExtracted ? 'Hide' : 'View'} Extracted Text
                  </button>
                  {showExtracted && (
                    <div className="border border-[#2A2A2A] p-3 max-h-48 overflow-y-auto">
                      <pre className="text-muted text-[10px] whitespace-pre-wrap font-body leading-relaxed">
                        {currentResume.extractedText}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Use for analysis note */}
      {currentResume?.extractedText && (
        <div className="deco-card p-4">
          <div className="flex items-center gap-3">
            <div className="diamond-icon-sm text-gold flex-shrink-0"><FileText size={12} /></div>
            <div>
              <div className="label-deco mb-0.5">Resume Connected to AI Analysis</div>
              <p className="text-muted text-xs">
                Your resume text is automatically included in all AI eligibility, skill gap, and preparation analyses.
                No manual action needed — the AI agent reads your resume alongside your profile.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
