import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { Terminal, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ usernameOrEmail, password });
      login(res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md">
        {/* Terminal header */}
        <div className="border border-border-primary rounded-t bg-bg-secondary">
          <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-border-primary">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-accent-red opacity-70" />
              <span className="w-3 h-3 rounded-full bg-accent-orange opacity-70" />
              <span className="w-3 h-3 rounded-full bg-accent-green opacity-70" />
            </div>
            <span className="text-sm text-text-muted ml-2">studyplatform -- login</span>
          </div>

          <div className="p-10">
            {/* ASCII branding */}
            <div className="mb-10">
              <div className="flex items-center gap-2.5 mb-3.5">
                <Terminal size={22} className="text-accent-green" />
                <span className="text-xl font-semibold text-text-bright">
                  study<span className="text-accent-green">platform</span>
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                AI-powered learning platform. authenticate to continue.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 mb-6 bg-accent-dim-red border border-accent-red/30 rounded text-sm text-accent-red">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-1.5 text-sm text-text-secondary mb-2.5">
                  <ChevronRight size={13} className="text-accent-green" />
                  username or email
                </label>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-3 text-base text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                  placeholder="user@example.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm text-text-secondary mb-2.5">
                  <ChevronRight size={13} className="text-accent-green" />
                  password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-3 text-base text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bg-tertiary border border-border-secondary rounded px-3.5 py-3 text-base text-accent-green hover:bg-bg-hover hover:border-accent-green/50 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="spinner" />
                    <span>authenticating...</span>
                  </>
                ) : (
                  <>
                    <ChevronRight size={17} />
                    <span>login</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-6 border-t border-border-primary">
              <p className="text-sm text-text-muted text-center">
                no account?{' '}
                <Link to="/register" className="text-accent-blue hover:underline">
                  register
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Terminal footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-bg-active border-x border-b border-border-primary rounded-b text-[15px] text-text-muted">
          <span>secure connection</span>
          <span>jwt + bcrypt</span>
        </div>
      </div>
    </div>
  );
}
