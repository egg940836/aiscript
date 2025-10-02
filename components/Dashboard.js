import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>歡迎回來！</h1>
        <p style={styles.email}>
          登入帳號：{user?.email}
        </p>
        
        <div style={styles.info}>
          <p>你已成功登入系統</p>
          <p>現在可以使用 AI Script 功能了</p>
        </div>

        <button onClick={handleSignOut} style={styles.button}>
          登出
        </button>
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
    background: '#f5f5f5',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#333'
  },
  email: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px'
  },
  info: {
    background: '#f0f0f0',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  button: {
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%'
  }
}
