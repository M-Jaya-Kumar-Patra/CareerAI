import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
export function PlaceholderPage({ title, description }) {
  return <div className="page-stack"><Link className="back-link" to="/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link><section className="card placeholder"><span className="badge badge-accent">Coming in the next phase</span><h1>{title}</h1><p className="subheading">{description}</p></section></div>;
}
