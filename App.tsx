import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/Auth/LoginForm'
import Dashboard from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <p>載入中...</p>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginForm />
}

export default App
