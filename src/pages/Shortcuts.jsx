import React from 'react';
import PageShell from '@/components/PageShell';

const groups = [
  {
    name: 'Navigation',
    rows: [
      ['g h', 'Home'],
      ['g t', 'Tool catalog'],
      ['g a', 'About'],
      ['g f', 'FAQ'],
      ['g p', 'Privacy Manifesto'],
      ['g w', 'How It Works'],
      ['g s', 'This shortcuts page'],
      ['g d', 'System Status'],
      ['g b', 'Feedback'],
      ['1 – 9', 'Jump to the Nth tool'],
      ['?', 'Open this page'],
      ['Esc', 'Back to Home'],
    ],
  },
  {
    name: 'Actions',
    rows: [
      ['U', 'Open the file picker (on a tool page)'],
      ['D', 'Trigger download (on a result page)'],
      ['Tab', 'Move focus between controls'],
      ['Enter / Space', 'Activate the focused control'],
    ],
  },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

export default function Shortcuts() {
  return (
    <PageShell title="Keyboard Shortcuts" description="Move through LocalPDF without reaching for the mouse. These work on every page, except while typing in a field.">
      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.name}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">{g.name}</h2>
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {g.rows.map(([keys, label]) => (
                    <tr key={keys} className="bg-card">
                      <td className="w-1/3 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {keys.split(' ').map((k, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-muted-foreground">then</span>}
                              <Key>{k}</Key>
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <p className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          Shortcuts are ignored while you're typing in an input field so they never interfere with
          form entry. The upload and download shortcuts find the relevant control on the current
          page — if there's nothing to upload or download yet, they do nothing.
        </p>
      </div>
    </PageShell>
  );
}