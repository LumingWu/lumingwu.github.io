/*
  Minimal React resume app for GitHub Pages.
  - Loads data from /data/data.json
  - Hash-based tab navigation (no build step)
*/

const { useEffect, useMemo, useState } = React;

// Minimal HTML sanitizer for opt-in HTML content in data.json
function sanitizeHTML(html) {
  try {
    const allowedTags = new Set(['b','strong','i','em','u','br','code','mark','sup','sub','small','a']);
    const allowedAttrs = { a: new Set(['href','target','rel','title']) };
    const container = document.createElement('div');
    container.innerHTML = String(html || '');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const el of nodes) {
      const tag = el.tagName?.toLowerCase();
      if (!allowedTags.has(tag)) {
        el.replaceWith(document.createTextNode(el.textContent || ''));
        continue;
      }
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        const value = attr.value || '';
        if (!allowedAttrs[tag]?.has(name)) {
          el.removeAttribute(attr.name);
          return;
        }
        if (tag === 'a' && name === 'href' && !/^https?:|^mailto:|^#/.test(value)) {
          el.removeAttribute(attr.name);
        }
      });
    }
    return container.innerHTML;
  } catch {
    return String(html || '');
  }
}

function RenderLine({ value, idx }) {
  if (value && typeof value === 'object' && 'html' in value) {
    const safe = sanitizeHTML(value.html);
    return <span key={idx} dangerouslySetInnerHTML={{ __html: safe }} />;
  }
  return <span key={idx}>{String(value)}</span>;
}

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  /*{ id: 'documents', label: 'Documents' },*/
];

function useHashRoute(defaultTab) {
  const [tab, setTab] = useState(() => (location.hash?.slice(1) || defaultTab));
  useEffect(() => {
    const onHash = () => setTab(location.hash?.slice(1) || defaultTab);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [defaultTab]);
  const navigate = (id) => {
    if (id !== tab) {
      location.hash = id;
      // Scroll to top on tab change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  return [tab, navigate];
}

function Header({ activeTab, onNav }) {
  return (
    <header className="site-header" role="navigation">
      <div className="site-header-inner container">
        <div className="brand" aria-label="Site">
          {/*<img src="images/portrait.jpg" alt="Portrait" />*/}
          <div className="name">Luming Wu</div>
        </div>
        <nav className="nav" aria-label="Primary">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              aria-current={activeTab === t.id ? 'page' : undefined}
              onClick={() => onNav(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Section({ title, children }) {
  return (
    <section className="section container" aria-label={title}>
      <h1>{title}</h1>
      <div className="spacer" />
      {children}
    </section>
  );
}

function KeyValue({ label, value, isLink }) {
  return (
    <div className="card">
      <strong>{label}: </strong>
      {isLink ? (
        <a href={value} target="_blank" rel="noreferrer">{value}</a>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}

function About({ about = [], contact = [] }) {
  return (
    <>
      <Section title="About">
        {about.map((sec, i) => (
          <div key={i} className="card">
            <h2>{sec.title}</h2>
            <div className="stack">
              {(sec.content || []).map((line, j) => (
                <RenderLine key={j} value={line} idx={j} />
              ))}
            </div>
          </div>
        ))}
      </Section>
      <Section title="Contact">
        <div className="stack">
          {contact.map((c, i) => (
            <KeyValue key={i} label={c.title} value={c.content} isLink={!!c.link} />
          ))}
        </div>
      </Section>
    </>
  );
}

function Projects({ projects = [] }) {
  return (
    <Section title="Proud Projects">
      {projects.map((p, i) => (
        <div key={i} className="card">
          <h2><a href={p.link} target="_blank" rel="noreferrer">{p.title}</a></h2>
          <div className="stack">
            {(p.content || []).map((line, j) => (
              <RenderLine key={j} value={line} idx={j} />
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function Skills({ skills = [] }) {
  const safeChipClasses = (val) => {
    const raw = String(val || '').trim();
    if (!raw) return '';
    if (!/^[-_ a-zA-Z0-9]+$/.test(raw)) return '';
    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map((c) => (c.startsWith('chip--') ? c : `chip--${c}`))
      .join(' ');
  };

  return (
    <Section title="Skills">
      {skills.map((s, i) => {
        const content = Array.isArray(s.content) ? s.content : [];
        const renderCertificates = (
          typeof s.title === 'string' && s.title.toLowerCase().includes('certificate')
        ) || content.some((item) => item && typeof item === 'object' && !Array.isArray(item) && (
          item.issued || item.issuedDate || item.credential || item.link
        ));

        return (
          <div key={i} className="card">
            <h2>{s.title}</h2>
            {renderCertificates ? (
              <div className="stack">
                {content.map((item, idx) => {
                  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
                  const label = String(item.label ?? item.name ?? '').trim();
                  if (!label) return null;
                  const issued = String(item.issued ?? item.issuedDate ?? '').trim();
                  const issuedDisplay = issued ? issued.replace(/^Issued:\s*/i, '').trim() : '';
                  const credential = String(item.credential ?? item.link ?? '').trim();
                  const showCredential = !!credential;
                  return (
                    <div key={`${i}-cert-${idx}`} className="stack">
                      <div><strong>{label}</strong></div>
                      {issued && (
                        <div className="muted">Issued: {issuedDisplay || issued}</div>
                      )}
                      {showCredential && (
                        <div>
                          <a href={credential} target="_blank" rel="noreferrer">Credential</a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="chips">
                {content.map((item, idx) => {
                  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
                  const label = String(item.label ?? item.name ?? '').trim();
                  if (!label) return null;
                  const marked = !!(item.highlight || item.strong);
                  const variant = safeChipClasses(item.class || item.classes || item.variant);
                  return (
                    <span key={`${i}-${idx}`} className={`chip ${marked ? 'chip--highlight' : ''} ${variant}`.trim()}>
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

function Education({ education = {} }) {
  const { schools = [], course_taken = [], course_taking = [] } = education || {};
  return (
    <Section title="Education">
      <h2>Schools</h2>
      <div className="stack">
        {schools.map((s, i) => (
          <div key={i} className="card">
            <div><strong>School:</strong> {s.school}</div>
            <div><strong>Degree:</strong> {s.degree}</div>
            <div><strong>Major:</strong> {s.major}</div>
            {s.gpa && <div><strong>GPA:</strong> {s.gpa}</div>}
            <div className="muted">{s.startdate} — {s.enddate}</div>
          </div>
        ))}
      </div>

      {course_taken?.length > 0 && (
        <>
          <div className="spacer" />
          <h2>Courses Taken</h2>
          <div className="card">
            <div className="stack">
              {course_taken.map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </>
      )}

      {course_taking?.length > 0 && (
        <>
          <div className="spacer" />
          <h2>Courses Taking</h2>
          <div className="card">
            <div className="stack">
              {course_taking.map((c, i) => <span key={i}>{c}</span>)}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

function Experience({ data }) {
  const { work_experience = [], technology_worked_with = [], activity = [], other_work_experience = [] } = data || {};
  return (
    <Section title="Experience">
      <h2>Computer Science Work Experience</h2>
      {work_experience.map((w, i) => (
        <div key={i} className="card">
          <div><strong>{w.company}</strong> — {w.location}</div>
          <div className="muted">{w.time}</div>
          <div className="stack">{(w.description || []).map((d, j) => <span key={j}>{d}</span>)}</div>
        </div>
      ))}

      {technology_worked_with?.length > 0 && (
        <>
          <div className="spacer" />
          <h2>Things That I Worked With</h2>
          {technology_worked_with.map((t, i) => (
            <div key={i} className="card">
              <div><strong>{t.name}</strong></div>
              <div className="stack">{(t.description || []).map((d, j) => <span key={j}>{d}</span>)}</div>
            </div>
          ))}
        </>
      )}

      {activity?.length > 0 && (
        <>
          <div className="spacer" />
          <h2>Activity</h2>
          {activity.map((a, i) => (
            <div key={i} className="card">
              <div><strong>{a.name}</strong></div>
              <div className="muted">{a.time}</div>
              <div className="stack">{(a.description || []).map((d, j) => <span key={j}>{d}</span>)}</div>
            </div>
          ))}
        </>
      )}

      {other_work_experience?.length > 0 && (
        <>
          <div className="spacer" />
          <h2>Other Work Experience</h2>
          {other_work_experience.map((o, i) => (
            <div key={i} className="card">
              <div><strong>{o.company}</strong> — {o.location}</div>
              <div className="muted">{o.time}</div>
              <div className="stack">{(o.description || []).map((d, j) => <span key={j}>{d}</span>)}</div>
            </div>
          ))}
        </>
      )}
    </Section>
  );
}

function Documents({ documents = [] }) {
  if (!documents?.length) return (
    <Section title="Documents">
      <div className="muted">No documents available.</div>
    </Section>
  );
  return (
    <Section title="Documents">
      {documents.map((doc, i) => (
        <details key={i}>
          <summary>
            <strong>{doc.title}</strong>
            <span className="muted"> — click to open</span>
          </summary>
          <div className="spacer" />
          <object className="pdf-frame" type="application/pdf" data={`documents/${doc.link}`}></object>
        </details>
      ))}
    </Section>
  );
}

function Loading() {
  return (
    <div className="container center" style={{ padding: 40 }}>
      <div className="muted">Loading resume…</div>
    </div>
  );
}

function ErrorView({ message }) {
  return (
    <div className="container">
      <div className="section" role="alert">
        <h1>Something went wrong</h1>
        <div className="card" style={{ borderColor: '#6b1b1b', background: '#1a1010' }}>
          <div className="muted">{message}</div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [route, navigate] = useHashRoute('about');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('data/data.json', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`);
        return res.json();
      })
      .then(json => {
        setData(json);
        setError(null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const content = useMemo(() => {
    if (!data) return null;
    switch (route) {
      case 'about':
        return <About about={data.about} contact={data.contact} />;
      case 'projects':
        return <Projects projects={data.proud_projects} />;
      case 'skills':
        return <Skills skills={data.skill} />;
      case 'education':
        return <Education education={data.education} />;
      case 'experience':
        return <Experience data={data} />;
      case 'documents':
        return <Documents documents={data.documents} />;
      default:
        return <About about={data.about} contact={data.contact} />;
    }
  }, [route, data]);

  return (
    <div className="app">
      <Header activeTab={route} onNav={navigate} />
      <main className="main" id="main-content">
        {loading && <Loading />}
        {error && <ErrorView message={error} />}
        {!loading && !error && content}
      </main>
    </div>
  );
}

// Mount
ReactDOM.render(<App />, document.getElementById('root'));
