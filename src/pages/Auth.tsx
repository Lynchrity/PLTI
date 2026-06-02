import { useState } from 'react';
import { supabase } from '../services/supabase';
import styles from './Auth.module.css';


const googleAuthEnabled =
  import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';
export function Auth() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  setError('');
  setLoading(true);

  if (password !== confirmPassword) {
    setError('Passwords do not match');
    setLoading(false);
    return;
  }

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          user_id: data.user.id,
          name,
          email: data.user.email,
          wallet_balance: 0,
        });

      if (dbError) {
        setError(dbError.message);
        return;
      }

      window.location.href = '/dashboard';
    }
  } catch (err) {
    setError('An error occurred during signup');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(`Failed to ${isSignup ? 'sign up' : 'sign in'} with Google`);
      console.error(err);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setName('');
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRememberMe(false);
  };

  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <nav className={styles.navbar}>
        <div></div>
        <div className={styles.navRight}>
          <button onClick={() => setIsSignup(true)} className={styles.signUpBtn}>Sign Up</button>
          <button onClick={() => setIsSignup(false)} className={styles.loginBtn}>Login</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Section - Hero & Features */}
        <div className={styles.leftSection}>
          <h1 className={styles.heroTitle}>
            Get Unstuck<br />Instantly.
          </h1>
          <p className={styles.heroSubtitle}>
            Peer Tutoring, ready<br />whenever you are.
          </p>

          {/* Feature Cards */}
          <div className={styles.featureCards}>
            <div className={styles.featureCard}>
              <div className={styles.iconCircle}>
                <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className={styles.featureText}>Request a<br />specific topic.</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.iconCircle}>
                <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.5 6v6l4.2 2.5" />
                </svg>
              </div>
              <p className={styles.featureText}>Choose your<br />duration.</p>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.iconCircle}>
                <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className={styles.featureText}>Get matched<br />with a top peer<br />and tutor</p>
            </div>
          </div>
        </div>

        {/* Right Section - Auth Form */}
        <div className={styles.rightSection}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>{isSignup ? 'Sign Up' : 'Login'}</h2>
              <p className={styles.formSubtitle}>
                {isSignup
                  ? 'Create an account to get started with peer tutoring.'
                  : 'Welcome back! Please log in to access your account.'}
              </p>
            </div>

            <form onSubmit={isSignup ? handleSignup : handleLogin} className={styles.form}>
              {error && (
                <div className={styles.errorAlert}>
                  {error}
                </div>
              )}
              {isSignup && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your Name"
                    className={styles.input}
                    required
                  />
                </div>
              )}
              {/* Email Field */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Email"
                  className={styles.input}
                  required
                />
              </div>

              {/* Password Field */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your Password"
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.togglePassword}
                  >
                    {showPassword ? (
                      <svg className={styles.eyeIcon} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className={styles.eyeIcon} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 4a7 7 0 016.642 11.135l-1.414-1.414A5 5 0 109 6.414l1.414-1.414A6.968 6.968 0 0010 4zm2.5 7a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field - Only show for signup */}
              {isSignup && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirm Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your Password"
                      className={styles.input}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={styles.togglePassword}
                    >
                      {showConfirmPassword ? (
                        <svg className={styles.eyeIcon} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className={styles.eyeIcon} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 4a7 7 0 016.642 11.135l-1.414-1.414A5 5 0 109 6.414l1.414-1.414A6.968 6.968 0 0010 4zm2.5 7a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot Password & Remember Me - Only show for login */}
              {!isSignup && (
                <div className={styles.formFooter}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember Me</span>
                  </label>
                  <a href="#" className={styles.forgotLink}>Forgot Password?</a>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={styles.submitBtn}
              >
                {loading
                  ? isSignup
                    ? 'Creating account...'
                    : 'Logging in...'
                  : isSignup
                    ? 'Sign Up'
                    : 'Login'}
              </button>
            </form>

            {/* Divider */}
            <div className={styles.divider}>
              <div className={styles.dividerLine}></div>
              <span className={styles.dividerText}>OR</span>
              <div className={styles.dividerLine}></div>
            </div>

            {/* Google Auth */}
            <button
              onClick={handleGoogleAuth}
              className={styles.googleBtn}
              disabled={!googleAuthEnabled}
            >
              {googleAuthEnabled
                ? 'Login with Google'
                : 'Coming Soon'}
            </button>


            {/* Toggle Link */}
            <p className={styles.signUpLink}>
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <button onClick={toggleMode} className={styles.toggleLink}>
                {isSignup ? 'Login' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
