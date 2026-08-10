import { CheckCircle2, Clock3, MessageSquare, Mic, MicOff, Play, Send, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { api } from '../lib/api.js';
import { getSpeechRecognition, speak } from '../lib/voice.js';

const interviewerProfiles = [
  { id: 'maya', name: 'Maya Chen', role: 'Engineering Manager', voice: 'female', color: '#4f46e5', hair: '#172554' },
  { id: 'david', name: 'David Brooks', role: 'Senior Technical Lead', voice: 'male', color: '#0f766e', hair: '#422006' },
  { id: 'sofia', name: 'Sofia Patel', role: 'People & Culture Partner', voice: 'female-alt', color: '#be185d', hair: '#3b0764' },
];

function InterviewerAvatar({ active, speaking, onSpeak, profile = interviewerProfiles[0] }) {
  const question = active?.turns?.slice().reverse().find((turn) => turn.role === 'interviewer')?.content;

  return (
    <div className={`interviewer-card ${speaking ? 'is-speaking' : ''}`}>
      <div className="interviewer-video" style={{ '--interviewer-color': profile.color, '--interviewer-hair': profile.hair }}>
        <div className="video-status"><i /> LIVE AI VIDEO</div>
        <div className="interviewer-portrait">
          <div className="portrait-hair" />
          <div className="portrait-face"><i /><i /><b /></div>
        </div>
        <div className="video-wave" />
      </div>
      <div className="interviewer-card-copy">
        <span className="eyebrow">AI interviewer - video call</span>
        <strong>{profile.name}</strong>
        <small>{profile.role}</small>
        <p>{active ? (speaking ? 'Speaking and listening to your answer...' : 'Your interviewer is ready') : 'Choose an interviewer and start your live practice call.'}</p>
        {question && <button className="voice-toggle" onClick={() => onSpeak(question, profile.voice)}><Volume2 size={14} /> Hear question</button>}
      </div>
    </div>
  );
}

export function InterviewsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ targetRole: '', difficulty: 'medium' });
  const [answer, setAnswer] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [interviewError, setInterviewError] = useState('');
  const [avatarVisible] = useState(true);
  const [profileId, setProfileId] = useState(() => window.localStorage.getItem('careerai-interviewer') || 'maya');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const silenceTimerRef = useRef(null);
  const intentionalStopRef = useRef(false);
  const startListeningRef = useRef(null);
  const spokenTurnRef = useRef(0);
  const { data: interviews = [] } = useQuery({ queryKey: ['interviews'], queryFn: async () => (await api.get('/interviews')).data.data.interviews });
  const { data: resumes = [], isLoading: resumesLoading } = useQuery({ queryKey: ['resumes'], queryFn: async () => (await api.get('/resumes')).data.data.resumes });
  const activeId = selectedId || interviews[0]?._id;
  const { data: active } = useQuery({ queryKey: ['interview', activeId], queryFn: async () => (await api.get(`/interviews/${activeId}`)).data.data.interview, enabled: Boolean(activeId) });
  const start = useMutation({ mutationFn: () => api.post('/interviews', { ...form, interviewerId: profileId }), onSuccess: (response) => { setInterviewError(''); setSelectedId(response.data.data.interview._id); setForm({ targetRole: '', difficulty: 'medium' }); queryClient.invalidateQueries({ queryKey: ['interviews'] }); queryClient.invalidateQueries({ queryKey: ['interview'] }); }, onError: (error) => setInterviewError(error.message || 'The interview AI is unavailable. Check your OpenRouter configuration.') });
  const submit = useMutation({ mutationFn: ({ answer: answerText } = {}) => api.post(`/interviews/${activeId}/answer`, { answer: answerText || answer }), onSuccess: () => { setInterviewError(''); setAnswer(''); finalTranscriptRef.current = ''; queryClient.invalidateQueries({ queryKey: ['interview', activeId] }); queryClient.invalidateQueries({ queryKey: ['interviews'] }); }, onError: (error) => setInterviewError(error.message || 'The interview AI could not generate the next question.') });
  const complete = useMutation({ mutationFn: () => api.post(`/interviews/${activeId}/complete`), onSuccess: () => { setInterviewError(''); queryClient.invalidateQueries({ queryKey: ['interview', activeId] }); queryClient.invalidateQueries({ queryKey: ['interviews'] }); } });
  const supported = Boolean(getSpeechRecognition());
  const activeProfileId = active?.interviewerId || profileId;
  const profile = interviewerProfiles.find((item) => item.id === activeProfileId) || interviewerProfiles[0];

  useEffect(() => {
    window.localStorage.setItem('careerai-interviewer', profileId);
  }, [profileId]);

  useEffect(() => () => {
    window.clearTimeout(silenceTimerRef.current);
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!voiceMode || !active || active.status !== 'active') return;
    const latest = [...active.turns].reverse().find((turn) => turn.role === 'interviewer');
    if (latest && active.turns.indexOf(latest) !== spokenTurnRef.current) {
      spokenTurnRef.current = active.turns.indexOf(latest);
      speak(latest.content, profile.voice);
      const listenDelay = Math.min(9000, Math.max(1800, latest.content.length * 45));
      const timer = window.setTimeout(() => startListeningRef.current?.(), listenDelay);
      return () => window.clearTimeout(timer);
    }
  }, [active, voiceMode, profile.voice]);

  const stopListening = () => {
    intentionalStopRef.current = true;
    window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const submitAnswer = () => {
    intentionalStopRef.current = true;
    window.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    const voiceAnswer = finalTranscriptRef.current.trim();
    const answerToSubmit = voiceAnswer || answer.trim();
    if (answerToSubmit && !submit.isPending) submit.mutate({ answer: answerToSubmit });
  };

  const startListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setVoiceError('Live speech recognition is not supported in this browser. You can still use text answers.');
      return;
    }
    if (recognitionRef.current || submit.isPending || !voiceMode || !active || active.status !== 'active') return;
    setVoiceError('');
    intentionalStopRef.current = false;
    finalTranscriptRef.current = '';
    setAnswer('');
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalTranscriptRef.current += `${result[0].transcript} `;
        else interimTranscript += result[0].transcript;
      }
      const transcript = `${finalTranscriptRef.current}${interimTranscript}`.trim();
      setAnswer(transcript);
      window.clearTimeout(silenceTimerRef.current);
      if (finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = window.setTimeout(() => submitAnswer(), 1400);
      }
    };
    recognition.onerror = () => { setVoiceError('Microphone recognition stopped. Check browser permission and try again.'); setListening(false); };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (!intentionalStopRef.current && finalTranscriptRef.current.trim()) submitAnswer();
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  startListeningRef.current = startListening;

  const handleAnswerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitAnswer();
    }
  };

  return (
    <div className="page-stack interview-page">
      <div className="interview-layout">
        <aside className="card interview-list">
          <div className="card-heading">
            <div>
              <h2>Your sessions</h2>
              <p className="form-note">Live AI video interviewer - latest resume context</p>
            </div>
            <Clock3 size={19} color="var(--color-accent)" />
          </div>

          <label className="field interviewer-selector">
            <span>Choose interviewer</span>
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              {interviewerProfiles.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.role}</option>)}
            </select>
          </label>

          <div className="interview-sessions">
            {interviews.map((item) => (
              <button key={item._id} className={`interview-session ${item._id === activeId ? 'active' : ''}`} onClick={() => setSelectedId(item._id)}>
                <MessageSquare size={15} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.status === 'completed' ? 'Completed' : 'In progress'}</small>
                </span>
              </button>
            ))}
            {!interviews.length && <p className="form-note">Start your first session.</p>}
          </div>

          {!resumesLoading && !resumes.length && (
            <div className="interview-resume-required">
              <strong>Resume required</strong>
              <p>Upload your resume first so the AI interviewer can ask about your real projects, skills, and experience.</p>
              <Link className="btn btn-secondary" to="/resume">Upload resume</Link>
            </div>
          )}
          {interviewError && <p className="form-error" role="alert">{interviewError}</p>}

          <form className="interview-start" onSubmit={(event) => { event.preventDefault(); if (form.targetRole.trim() && resumes.length) start.mutate(); }}>
            <label className="field">
              <span>Target role</span>
              <input value={form.targetRole} onChange={(event) => setForm({ ...form, targetRole: event.target.value })} placeholder="e.g. Product Designer" />
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <Button type="submit" disabled={start.isPending || !form.targetRole.trim() || !resumes.length}>
              <Play size={15} /> {start.isPending ? 'Connecting to AI...' : 'Start AI interview'}
            </Button>
          </form>
        </aside>

        <section className="card interview-workspace">
          {!active && (
            <div className="interview-empty">
              <InterviewerAvatar profile={profile} onSpeak={(text) => speak(text, profile.voice)} />
              <h2>Your next interview starts here.</h2>
              <p className="body-copy">The AI interviewer will generate each question live from your resume and answers.</p>
            </div>
          )}
          {active && (
            <>
              <header className="interview-header">
                <div>
                  <p className="eyebrow">{active.difficulty} difficulty</p>
                  <h2>{active.targetRole}</h2>
                </div>
                <div className="interview-header-actions">
                  {active.status === 'active' && <button className={`voice-toggle ${voiceMode ? 'active' : ''}`} onClick={() => { if (voiceMode) stopListening(); setVoiceMode(!voiceMode); setVoiceError(''); }} disabled={!supported} title={supported ? 'Toggle hands-free voice mode' : 'Speech recognition is not supported'}><Volume2 size={15} /> {voiceMode ? 'Hands-free voice on' : 'Voice mode'}</button>}
                  <span className={`badge ${active.status === 'completed' ? 'badge-success' : 'badge-accent'}`}>{active.status === 'completed' ? 'Completed' : 'In progress'}</span>
                </div>
              </header>
              <InterviewerAvatar active={active} profile={profile} speaking={voiceMode} onSpeak={(text) => speak(text, profile.voice)} />
              {avatarVisible && (
                <div className="interview-transcript">
                  {active.turns.map((turn, index) => (
                    <article className={`interview-turn ${turn.role}`} key={`${turn.createdAt || index}-${index}`}>
                      <span>{turn.role === 'interviewer' ? 'Interviewer' : 'You'}</span>
                      <p>{turn.content}</p>
                    </article>
                  ))}
                </div>
              )}
              {active.status === 'active' ? (
                <div className="interview-composer">
                  <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleAnswerKeyDown} placeholder={voiceMode ? 'Speak naturally; your answer submits after a short pause...' : 'Type your answer...'} rows="4" aria-label="Interview answer" />
                  <div className="interview-composer-actions">
                    {voiceMode && <Button variant="ghost" onClick={listening ? stopListening : startListening} disabled={submit.isPending}>{listening ? <><MicOff size={15} /> Pause microphone</> : <><Mic size={15} /> Start microphone</>}</Button>}
                    <Button onClick={submitAnswer} disabled={submit.isPending || !answer.trim()}><Send size={15} /> {submit.isPending ? 'Asking AI...' : 'Send answer'}</Button>
                    <Button variant="ghost" onClick={() => { stopListening(); complete.mutate(); }} disabled={complete.isPending}>End interview</Button>
                  </div>
                  {voiceMode && <p className="voice-note">{listening ? 'Listening... pause briefly when you finish and the answer will submit automatically.' : 'Voice mode will listen after the interviewer finishes speaking.'}</p>}
                  {voiceError && <p className="form-error">{voiceError}</p>}
                </div>
              ) : (
                <div className="interview-evaluation">
                  {active.evaluation?.available ? (
                    <>
                      <div className="evaluation-score"><strong>{active.evaluation.score}</strong><span>/ 100</span></div>
                      <div>
                        <h3>Feedback</h3>
                        <p>{active.evaluation.summary}</p>
                        <strong>Strengths</strong>
                        <ul>{active.evaluation.strengths?.map((item) => <li key={item}>{item}</li>)}</ul>
                        <strong>Improve next</strong>
                        <ul>{active.evaluation.improvements?.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={28} color="var(--color-accent)" />
                      <div>
                        <h3>Practice complete</h3>
                        <p className="form-note">Your transcript is saved. AI evaluation will appear when the interview model is configured.</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
