import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (error) throw error

      if (isSignUp) {
        alert('註冊成功！請檢查您的信箱確認郵件。')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {isSignUp ? '建立帳號' : '登入'}
        </h2>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>電子郵件</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? '處理中...' : isSignUp ? '註冊' : '登入'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignUp ? '已有帳號？' : '還沒帳號？'}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={styles.toggleButton}
          >
            {isSignUp ? '登入' : '註冊'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#333'
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    borderLeft: '4px solid #e74c3c'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px'
  },
  toggle: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#666'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    marginLeft: '5px',
    fontSize: '14px',
    fontWeight: '600'
  }
}
