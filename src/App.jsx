
import './index.css';
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { activarDemoLocal, obtenerRol } from './sesion.js';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate
} from 'react-router-dom';

import Login from './componente/login/Login';
import Registro from './componente/login/Registro';
import Restablecer from './componente/login/Restablecer';
import Principal from './componente/pgPrincipal/Principal';
import Trabajadores from './componente/rrhh/Trabajadores.jsx';
import SoporteYayuda from './componente/soporteYayuda/SoporteYayuda.jsx';
import Facturas from './componente/contabilidad/Facturas.jsx';
import Compras from './componente/contabilidad/Compras.jsx';
import Lista from './componente/contabilidad/Lista.jsx';
import Viajes from './componente/viajes/Viajes.jsx';
import './responsive.css';

// Activa las mismas pantallas Demo existentes, sin crear una sesión de API.
const AccesoDemoLocal = () => {
  const navigate = useNavigate();
  useEffect(() => {
    activarDemoLocal();
    navigate('/principal', { replace: true });
  }, [navigate]);
  return null;
};

const RutaProtegida = ({ roles }) => {
  const rol = obtenerRol();

  if (rol === null) {
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(rol)) {
    return <Navigate to="/principal" replace />;
  }

  return <Outlet />;
};

// El usuario Demo nunca monta los componentes
// que realizan operaciones reales en MySQL.
const ModuloERP = ({ componente }) => {
  const rol = obtenerRol();

  if (rol === 6) {
    return null;
  }

  return componente;
};

RutaProtegida.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.number)
};

ModuloERP.propTypes = {
  componente: PropTypes.element.isRequired
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/demo" element={<AccesoDemoLocal />} />
        <Route path="/restablecer" element={<Restablecer />} />

        <Route
          path="/registro"
          element={<Registro />}
        />

        <Route element={<RutaProtegida />}>
          <Route path="/principal" element={<Principal />}>

            <Route element={
              <RutaProtegida roles={[1, 2, 3, 6]} />
            }>
              <Route
                path="trabajadores"
                element={<ModuloERP componente={<Trabajadores />} />}
              />
            </Route>

            <Route element={
              <RutaProtegida roles={[1, 3, 6]} />
            }>
              <Route
                path="regviajes"
                element={<ModuloERP componente={<Viajes />} />}
              />
            </Route>

            <Route element={
              <RutaProtegida roles={[1, 2, 6]} />
            }>
              <Route
                path="compras"
                element={<ModuloERP componente={<Compras />} />}
              />
              <Route
                path="facturas"
                element={<ModuloERP componente={<Facturas />} />}
              />
              <Route
                path="lista"
                element={<ModuloERP componente={<Lista />} />}
              />
            </Route>

            <Route
              path="soporteYayuda"
              element={<ModuloERP componente={<SoporteYayuda />} />}
            />

          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
