import { useState } from "react";
import { cloudEnabled, signInWithEmail, signInWithGoogle, signUpWithEmail } from "../cloud";
import { Icon, type IconName } from "../ui/Icon";
import { Ring } from "../ui/Ring";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "sparkle", title: "A program built for you", body: "Answer a few questions and get a plan that fits your days, equipment and goals." },
  { icon: "camera", title: "Macros from a photo", body: "Snap your plate or scan a barcode to log protein, carbs and fat in seconds." },
  { icon: "chart", title: "Every muscle on target", body: "Weekly set targets per muscle, with progression suggestions every session." },
];

export function Welcome({ onGuest }: { onGuest: () => void }) {
  const [mode, setMode] = useState<"start" | "signup" | "signin">("start");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const google = async () => {
    setBusy(true);
    setMessage(null);
    const r = await signInWithGoogle();
    setBusy(false);
    if (!r.ok) setMessage({ tone: "error", text: r.error });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setMessage({ tone: "error", text: "Use at least 8 characters for your password." });
    setBusy(true);
    setMessage(null);
    const r = mode === "signup" ? await signUpWithEmail(email.trim(), password, name.trim()) : await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!r.ok) setMessage({ tone: "error", text: r.error });
    else if (r.message) setMessage({ tone: "info", text: r.message });
  };

  return (
    <div className="welcome">
      <section className="welcome-hero">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="dumbbell" size={18} stroke={2.4} />
          </span>
          Setwise
        </div>
        <div className="hero-rings" aria-hidden="true">
          <Ring value={0.82} size={150} width={13} color="var(--hero-accent)" track="var(--hero-track)" />
          <div className="hero-rings-inner">
            <Ring value={0.64} size={112} width={13} color="var(--rest)" track="var(--hero-track)" />
          </div>
          <div className="hero-rings-inner2">
            <Ring value={0.91} size={74} width={13} color="var(--warn)" track="var(--hero-track)" />
          </div>
        </div>
        <h1 className="welcome-title">Train smarter. Eat on target.</h1>
        <p className="welcome-sub">Your workouts, weekly muscle volume and daily macros in one app, personalized from day one.</p>
      </section>

      <div className="welcome-body">
        {mode === "start" ? (
          <>
            <ul className="feature-list">
              {FEATURES.map((f) => (
                <li key={f.title} className="feature">
                  <span className="feature-icon">
                    <Icon name={f.icon} size={20} />
                  </span>
                  <span>
                    <strong>{f.title}</strong>
                    <span>{f.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="auth-actions">
              <button className="btn-google" onClick={google} disabled={busy}>
                <GoogleMark />
                Continue with Google
              </button>
              <button className="btn-primary" onClick={() => { setMode("signup"); setMessage(null); }}>
                Sign up with email
              </button>
              <button className="btn-plain" onClick={onGuest}>
                Try it without an account
              </button>
              {message && <p className={`auth-msg ${message.tone}`} role="alert">{message.text}</p>}
              <p className="auth-foot">
                Already a member?{" "}
                <button className="inline-link" onClick={() => { setMode("signin"); setMessage(null); }}>
                  Sign in
                </button>
              </p>
              {!cloudEnabled && <p className="auth-note">Preview build: accounts turn on once the backend is connected. Guest mode saves to this device.</p>}
            </div>
          </>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <button type="button" className="back-link" onClick={() => { setMode("start"); setMessage(null); }}>
              <Icon name="chevron" size={16} className="flip" /> Back
            </button>
            <h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
            <button type="button" className="btn-google" onClick={google} disabled={busy}>
              <GoogleMark />
              {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
            </button>
            <div className="divider"><span>or</span></div>
            {mode === "signup" && (
              <label className="field">
                <span>Name</span>
                <input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" required />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </label>
            {message && <p className={`auth-msg ${message.tone}`} role="alert">{message.text}</p>}
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
            <p className="auth-foot">
              {mode === "signup" ? "Already a member? " : "New here? "}
              <button type="button" className="inline-link" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMessage(null); }}>
                {mode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
