import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Pricing from './pages/Pricing'
import Showcase from './pages/Showcase'
import Login from './pages/Login'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Cookies from './pages/Cookies'
import NotFound from './pages/NotFound'
import APITest from './pages/APITest'
import Account from './pages/Account'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import ResetPassword from './pages/ResetPassword'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import './styles/global.css'

function App() {
  const location = useLocation();

  // 路由变化时自动滚动到页面顶部
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // 平滑滚动效果
    });
  }, [location.pathname]);

  return (
    <LanguageProvider>
    <AuthProvider>
      <div className="App">
        <Header />
        <main>
          <Routes>
              {/* 支持语言前缀的路由 */}
              <Route path="/:lang?" element={<Home />} />
              <Route path="/:lang/editor" element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            } />
              <Route path="/:lang/showcase" element={<Showcase />} />
              <Route path="/:lang/pricing" element={<Pricing />} />
              <Route path="/:lang/api-test" element={<APITest />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/:lang/reset-password" element={<ResetPassword />} />
              <Route path="/:lang/login" element={<Login />} />
              <Route path="/:lang/account" element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              } />
              <Route path="/:lang/billing" element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="/:lang/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/:lang/terms" element={<Terms />} />
              <Route path="/:lang/privacy" element={<Privacy />} />
              <Route path="/:lang/cookies" element={<Cookies />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
    </LanguageProvider>
  )
}

export default App