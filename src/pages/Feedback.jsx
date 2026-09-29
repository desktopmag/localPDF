import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import { CircleCheck, Send, Loader2 } from 'lucide-react';

const types = [
  { id: 'bug', label: 'Bug report' },
  { id: 'suggestion', label: 'Tool suggestion' },
  { id: 'other', label: 'Other' },
];

export default function Feedback() {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    // No backend: store the submission locally so it survives a refresh.
    try {
      const prev = JSON.parse(localStorage.getItem('localpdf_feedback') || '[]');
      prev.push({ type, message: message.trim(), at: new Date().toISOString() });
      localStorage.setItem('localpdf_feedback', JSON.stringify(prev));
    } catch { /* ignore quota errors */ }
    setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 400);
  }

  function reset() {
    setSent(false);
    setMessage('');
    setType('bug');
  }

  if (sent) {
    return (
      <PageShell title="Feedback" description="Report a bug or suggest a tool — entirely without a server connection.">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CircleCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-foreground">Thank you</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your feedback was saved locally on this device. Because BolaPDF has no server, your
            message isn't transmitted anywhere — but it's recorded here for your own reference.
          </p>
          <button onClick={reset} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            Send another
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Feedback" description="Report a bug or suggest a tool — entirely without a server connection.">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Type</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`rounded-xl border p-4 text-left transition-all ${type === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'}`}
              >
                <p className="font-display text-sm font-semibold text-foreground">{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Message</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            required
            placeholder="What happened, or what tool would you like to see?"
            className="w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit feedback
        </button>

        <p className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          Because BolaPDF runs without a backend, your submission is saved to this browser's
          localStorage and never sent over the network. To reach the maintainers another way,
          copy your message and send it through your usual channel.
        </p>
      </form>
    </PageShell>
  );
}