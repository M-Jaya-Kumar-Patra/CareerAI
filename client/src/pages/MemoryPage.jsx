import { Brain, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { Button } from '../components/ui/Button.jsx';

const categories = ['goal', 'skill', 'preference', 'experience', 'learning', 'other'];

export function MemoryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', content: '', category: 'other' });
  const { data: memories = [], isLoading } = useQuery({ queryKey: ['memories'], queryFn: async () => (await api.get('/memories')).data.data.memories });
  const create = useMutation({
    mutationFn: () => api.post('/memories', form),
    onSuccess: () => { setForm({ title: '', content: '', category: 'other' }); queryClient.invalidateQueries({ queryKey: ['memories'] }); },
  });
  const remove = useMutation({ mutationFn: (id) => api.delete(`/memories/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] }) });
  const submit = (event) => { event.preventDefault(); if (form.title.trim() && form.content.trim()) create.mutate(); };
  return <div className="page-stack memory-page"><div className="page-heading"><div><p className="eyebrow">Personal context</p><h1>AI Memory</h1><p className="subheading">Save goals, preferences, and experience so Career Coach can give more relevant guidance.</p></div></div><div className="memory-grid"><section className="card"><div className="card-heading"><div><h2>Add a memory</h2><p className="form-note">Only you and your AI Coach can access these notes.</p></div><Brain size={20} color="var(--color-accent)" /></div><form className="memory-form" onSubmit={submit}><label className="field"><span>Title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. My target role" maxLength="120" /></label><label className="field"><span>What should Career Coach remember?</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="I am targeting frontend roles at product companies..." rows="5" maxLength="5000" /></label><label className="field"><span>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category} value={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label><Button type="submit" disabled={create.isPending || !form.title.trim() || !form.content.trim()}><Plus size={16} /> {create.isPending ? 'Saving...' : 'Save memory'}</Button>{create.isError && <p className="form-error">{create.error.message || 'Unable to save memory.'}</p>}</form></section><section className="card"><div className="card-heading"><div><h2>Saved memories</h2><p className="form-note">{memories.length} {memories.length === 1 ? 'memory' : 'memories'} available to your coach</p></div></div>{isLoading ? <p className="form-note memory-empty">Loading memories...</p> : !memories.length ? <div className="memory-empty"><Brain size={28} /><p>No saved memories yet.</p><span>Add context to make your coaching more personal.</span></div> : <div className="memory-list">{memories.map((memory) => <article className="memory-row" key={memory._id}><div className="memory-row-content"><div><strong>{memory.title}</strong><span className="badge badge-muted">{memory.category}</span></div><p>{memory.content}</p><small>{new Date(memory.updatedAt).toLocaleDateString()}</small></div><button className="icon-btn" aria-label={`Delete ${memory.title}`} onClick={() => remove.mutate(memory._id)} disabled={remove.isPending}><Trash2 size={16} /></button></article>)}</div>}</section></div></div>;
}
