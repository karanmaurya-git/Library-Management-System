import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function Toast({ message, type = 'info' }) {
  if (!message) return null;
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div className={`toast${type === 'error' ? ' error' : ''}`}>
      <Icon size={15} strokeWidth={2} />
      {message}
    </div>
  );
}
