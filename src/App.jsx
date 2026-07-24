import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Catalogo from './pages/Catalogo'
import CatalogoPublico from './pages/CatalogoPublico'
import Etiquetas from './pages/Etiquetas'
import Escaner from './pages/Escaner'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Usuarios from './pages/Usuarios'
import AdminPanel from './pages/admin/AdminPanel'
import ConfiguracionElectron from './pages/ConfiguracionElectron'
import EscanerMovil from './pages/EscanerMovil'
import Informacion from './pages/Informacion'
import RestablecerPassword from './pages/RestablecerPassword'
import Historial from './pages/Historial'   // <-- NUEVA IMPORTACIÓN

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* / siempre va a login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/escaner-movil" element={<EscanerMovil />} />
          <Route path="/catalogo/:slug" element={<CatalogoPublico />} />
          <Route path="/restablecer-password" element={<RestablecerPassword />} />

          {/* Admin — sin Layout de tienda */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          } />

          {/* Rutas protegidas con Layout */}
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="inventario"        element={<Inventario />}    />
            <Route path="ventas"            element={<Ventas />}        />
            <Route path="historial"         element={<Historial />}     />
            <Route path="clientes"          element={<Clientes />}      />
            <Route path="catalogo"          element={<Catalogo />}      />
            <Route path="etiquetas"         element={<Etiquetas />}     />
            <Route path="escaner"           element={<Escaner />}       />
            <Route path="reportes"          element={<Reportes />}      />
            <Route path="configuracion"     element={<Configuracion />} />
            <Route path="usuarios"          element={<Usuarios />}      />
            <Route path="configuracion-app" element={<ConfiguracionElectron />} />
            <Route path="informacion"       element={<Informacion />} />
          </Route>

          {/* Cualquier otra ruta → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}