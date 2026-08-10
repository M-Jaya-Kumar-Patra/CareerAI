import { Download, Eye, FileCheck2, FileText, LoaderCircle, Trash2, UploadCloud, WandSparkles } from 'lucide-react';
/* global FormData, URL */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button.jsx';
import { api } from '../lib/api.js';

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ResumeReport({ analysis, score }) {
  if (!analysis) {
    return <p className="resume-ready-note">Text extracted successfully. Run ATS analysis to generate a role-specific report.</p>;
  }

  return (
    <div className="resume-report">
      <div className="resume-score">
        <strong>{score ?? 0}</strong>
        <span>/100 ATS score</span>
      </div>
      <div className="resume-report-body">
        <h3>AI report</h3>
        {analysis.summary && <p>{analysis.summary}</p>}
        {analysis.strengths?.length > 0 && (
          <div>
            <strong>Strengths</strong>
            <ul>{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {analysis.improvements?.length > 0 && (
          <div>
            <strong>Improve next</strong>
            <ul>{analysis.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        )}
        {analysis.missingKeywords?.length > 0 && (
          <div className="resume-keywords">
            <strong>Missing keywords</strong>
            <p>{analysis.missingKeywords.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeFilePreview({ resume }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const file = useQuery({
    queryKey: ['resume-file', resume._id],
    queryFn: async () => (await api.get(`/resumes/${resume._id}/file`, { responseType: 'blob' })).data,
    enabled: Boolean(resume?._id),
  });

  useEffect(() => {
    if (!file.data) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file.data);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file.data]);

  const downloadResumeFile = () => {
    if (!previewUrl) return;
    const anchor = document.createElement('a');
    anchor.href = previewUrl;
    anchor.download = resume.fileName || 'resume';
    anchor.click();
  };

  return (
    <aside className="resume-inline-preview">
      <div className="resume-inline-preview-header">
        <span><Eye size={14} /> Preview</span>
        <button className="icon-btn" type="button" aria-label={`Download ${resume.fileName}`} onClick={downloadResumeFile} disabled={!previewUrl}><Download size={15} /></button>
      </div>
      {file.isFetching && <div className="resume-loading"><LoaderCircle className="spin" size={18} /> Loading preview...</div>}
      {!file.isFetching && resume.mimeType === 'application/pdf' && previewUrl && <iframe className="resume-file-preview" src={previewUrl} title={resume.fileName} />}
      {!file.isFetching && resume.mimeType !== 'application/pdf' && previewUrl && <div className="resume-file-fallback"><FileText size={34} /><h3>DOCX preview</h3><p>Download the original uploaded file to view it.</p><button className="btn btn-secondary" type="button" onClick={downloadResumeFile}><Download size={15} /> Download</button></div>}
      {!file.isFetching && file.isError && <div className="resume-file-fallback"><FileText size={34} /><h3>No preview</h3><p>The original file is unavailable for this resume.</p></div>}
    </aside>
  );
}

export function ResumePage() {
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => (await api.get('/resumes')).data.data.resumes,
  });
  const upload = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('resume', file);
      return (await api.post('/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data.resume;
    },
    onSuccess: () => { setMessage('Resume uploaded and text extracted successfully.'); queryClient.invalidateQueries({ queryKey: ['resumes'] }); },
    onError: (error) => setMessage(error.message || 'Unable to process this resume.'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/resumes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] }),
    onError: (error) => setMessage(error.message || 'Unable to delete this resume.'),
  });
  const analyze = useMutation({
    mutationFn: (id) => api.post(`/resumes/${id}/analyze`, { targetRole }),
    onSuccess: () => { setMessage('ATS analysis completed.'); queryClient.invalidateQueries({ queryKey: ['resumes'] }); },
    onError: (error) => setMessage(error.message || 'Unable to analyze this resume.'),
  });

  const selectFile = (file) => {
    setMessage('');
    if (!file) return;
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setMessage('Choose a PDF or DOCX file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Resume files must be 10 MB or smaller.');
      return;
    }
    upload.mutate(file);
  };

  const latestResumeId = data?.[0]?._id;
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Resume intelligence</p>
          <h1>Turn your resume into momentum.</h1>
          <p className="subheading">Upload a resume to extract your experience and prepare it for ATS analysis.</p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}><UploadCloud size={16} /> Upload resume</Button>
        <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => selectFile(event.target.files?.[0])} />
      </section>

      <section className={`upload-zone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}>
        <div className="upload-icon"><UploadCloud size={24} /></div>
        <h2>Drop your resume here</h2>
        <p className="body-copy">or click to browse from your device</p>
        <button className="btn btn-secondary" type="button" onClick={() => inputRef.current?.click()}>Choose PDF or DOCX</button>
        <span className="upload-hint">Maximum 10 MB - Your document stays private</span>
      </section>

      {message && <p className="form-note" role="status">{message}</p>}

      <section className="card resume-documents-card">
        <div className="card-heading">
          <div><p className="eyebrow">Your documents</p><h2>Uploaded resumes</h2></div>
          <span className="badge badge-muted">{data?.length || 0} saved</span>
        </div>
        {isLoading && <div className="resume-loading"><LoaderCircle className="spin" size={20} /> Loading resumes...</div>}
        {isError && <p className="form-note">We couldn&apos;t load your resumes. Please retry.</p>}
        {!isLoading && !isError && !data?.length && <div className="resume-empty"><FileText size={24} /><p>No resume uploaded yet.</p><span>Upload your latest resume to get started.</span></div>}
        {!!data?.length && (
          <>
            <label className="field resume-role-field">
              <span>Target role for ATS analysis</span>
              <input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="e.g. Full Stack Developer" />
            </label>
            <div className="resume-list">
              {data.map((resume) => {
                const analysis = resume.parsedData?.aiAnalysis;
                const sections = resume.parsedData?.sections || [];
                return (
                  <article className="resume-row" key={resume._id}>
                    <div className="resume-card-main">
                      <div className="resume-card-top">
                        <div className="resume-file-icon"><FileCheck2 size={20} /></div>
                        <div className="resume-meta">
                          <div className="resume-title-row">
                            <strong>{resume.fileName}</strong>
                            {resume._id === latestResumeId && <span className="badge badge-accent">Latest</span>}
                          </div>
                          <span>{formatSize(resume.fileSize)} - Added {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(resume.createdAt))}</span>
                          {sections.length > 0 && <div className="resume-section-tags">{sections.slice(0, 5).map((section) => <span key={section}>{section}</span>)}</div>}
                        </div>
                      </div>
                      <ResumeReport analysis={analysis} score={resume.atsScore} />
                      <div className="resume-actions">
                        <span className={`badge ${resume.atsScore !== null ? 'badge-success' : 'badge-muted'}`}>{resume.atsScore !== null ? 'Analyzed' : 'Text ready'}</span>
                        <button className="btn btn-secondary" type="button" onClick={() => analyze.mutate(resume._id)} disabled={analyze.isPending}><WandSparkles size={14} /> Analyze</button>
                        <button className="icon-btn" aria-label={`Delete ${resume.fileName}`} onClick={() => remove.mutate(resume._id)} disabled={remove.isPending}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <ResumeFilePreview resume={resume} />
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="card resume-next">
        <div>
          <span className="badge badge-accent">AI resume intelligence</span>
          <h2>Analyze your fit for a target role</h2>
          <p className="body-copy">CareerAI scores your resume against the role you provide and highlights strengths, missing keywords, and improvements.</p>
        </div>
        <WandSparkles size={32} />
      </section>
    </div>
  );
}
