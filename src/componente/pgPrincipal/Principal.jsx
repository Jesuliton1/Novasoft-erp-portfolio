
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { jsPDF } from 'jspdf';

import {
  SolutionOutlined,
  AreaChartOutlined,
  CreditCardOutlined,
  MailOutlined,
  AppstoreOutlined,
  PoweroffOutlined,
  InstagramOutlined,
  FacebookOutlined,
  XOutlined,
  RightOutlined,
  LeftOutlined,
  CalendarOutlined,
  CarOutlined,
  RobotOutlined,
  GoogleOutlined,
  CalculatorOutlined
} from '@ant-design/icons';

import { Breadcrumb, Layout, Menu, Button } from 'antd';
import './estilosPrn.css';
import { obtenerRol, esDemoLocal, salirDemoLocal } from '../../sesion.js';

const { Header, Content, Sider } = Layout;

const trabajadoresDemo = [
  { nombre: 'Ana Ejemplo', puesto: 'Administrador', ciudad: 'Granada' },
  { nombre: 'Carlos Demo', puesto: 'Contable', ciudad: 'Málaga' },
  { nombre: 'Lucía Prueba', puesto: 'Agente', ciudad: 'Sevilla' }
];

const reservasDemo = [
  {
    id: 'DEMO-001',
    cliente: 'Cliente Ejemplo',
    destino: 'París',
    entrada: '2026-11-15',
    salida: '2026-11-20',
    total: 850,
    estado: 'Pagado'
  },
  {
    id: 'DEMO-002',
    cliente: 'Cliente Ficticio',
    destino: 'Roma',
    entrada: '2026-12-05',
    salida: '2026-12-09',
    total: 620,
    estado: 'Pendiente'
  }
];

const formatoPrecio = (importe) =>
  Number(importe).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });

const tarjeta = {
  padding: 22,
  background: '#ffffff',
  border: '1px solid #dce5ed',
  borderRadius: 12,
  marginBottom: 18,
  boxShadow: '0 3px 12px rgba(0,0,0,0.05)'
};

const campo = {
  width: '100%',
  padding: 10,
  marginTop: 7,
  marginBottom: 15,
  border: '1px solid #ccd6e0',
  borderRadius: 6
};

const Principal = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');

  // Datos locales, exclusivos de la demostracion
  const [cantidadDemo, setCantidadDemo] = useState(2);
  const [precioDemo, setPrecioDemo] = useState(150);
  const [destinoDemo, setDestinoDemo] = useState('París');
  const [clienteDemo, setClienteDemo] = useState('Cliente Ejemplo');

  const navigate = useNavigate();
  const location = useLocation();

  const rol = obtenerRol();
  const esDemo = rol === 6;

  useEffect(() => {
    if (rol === null) {
      navigate('/', { replace: true });
      return;
    }

    const nombre = esDemoLocal() ? 'demo_local' :
      location.state?.usuario ||
      localStorage.getItem('nombreUsuario') ||
      (esDemo ? 'demo_local' : 'Usuario');

    setNombreUsuario(nombre);
  }, [location.state, navigate, rol, esDemo]);

  // Menu por perfiles
  const menuItems = [
    {
      key: 'inicio',
      label: 'Inicio',
      icon: <AreaChartOutlined />
    },
    ...([1, 3, 6].includes(rol) ? [{
      key: 'regviajes',
      label: 'Gestión de Reservas',
      icon: <SolutionOutlined />
    }] : []),
    ...([1, 2, 6].includes(rol) ? [{
      key: 'pagos',
      label: 'Contabilidad',
      icon: <CreditCardOutlined />,
      children: [
        { key: 'compras', label: 'Compras' },
        { key: 'facturas', label: 'Facturas' },
        { key: 'lista', label: 'Planes y Compras' }
      ]
    }] : []),
    ...([1, 2, 3, 6].includes(rol) ? [{
      key: 'rrhh',
      label: 'RRHH',
      icon: <AppstoreOutlined />
    }] : []),
    {
      key: 'soporte',
      label: 'Soporte y Ayuda',
      icon: <MailOutlined />
    }
  ];

  const rutas = {
    inicio: '/principal',
    regviajes: '/principal/regviajes',
    compras: '/principal/compras',
    facturas: '/principal/facturas',
    lista: '/principal/lista',
    rrhh: '/principal/trabajadores',
    soporte: '/principal/soporteYayuda'
  };

  const handleMenuClick = ({ key }) => {
    if (rutas[key]) {
      navigate(rutas[key]);
    }
  };

  const handleLogout = () => {
    if (!window.confirm('¿Deseas cerrar sesión?')) return;

    if (esDemoLocal()) {
      salirDemoLocal();
      navigate('/', { replace: true });
      return;
    }

    sessionStorage.removeItem('token');
    localStorage.removeItem('nombreUsuario');
    navigate('/', { replace: true });
  };

  // PDF ficticio: no consulta la base de datos
  const generarPDFDemo = () => {
    const reserva = reservasDemo[0];
    const doc = new jsPDF();

    doc.setFillColor(0, 45, 85);
    doc.rect(0, 0, 210, 48, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(21);
    doc.text('NOVASOFT', 18, 21);

    doc.setFontSize(13);
    doc.text('RESUMEN DE RESERVA DEMO', 18, 33);

    doc.setTextColor(0, 45, 85);
    doc.setFontSize(14);
    doc.text('Datos ficticios de demostracion', 18, 64);

    doc.setFontSize(11);
    doc.text(`Referencia: ${reserva.id}`, 18, 82);
    doc.text(`Cliente: ${reserva.cliente}`, 18, 95);
    doc.text(`Destino: ${reserva.destino}`, 18, 108);
    doc.text(`Entrada: ${reserva.entrada}`, 18, 121);
    doc.text(`Salida: ${reserva.salida}`, 18, 134);
    doc.text(`Estado: ${reserva.estado}`, 18, 147);

    doc.setFillColor(236, 244, 252);
    doc.roundedRect(15, 163, 180, 30, 3, 3, 'F');

    doc.setFontSize(16);
    doc.text(
      `Importe: ${formatoPrecio(reserva.total)}`,
      22,
      182
    );

    doc.setFontSize(10);
    doc.text(
      'Documento de ejemplo. No es una factura fiscal.',
      18,
      215
    );

    doc.save('Novasoft_Reserva_Demo.pdf');
  };

  const mostrarInicio = () => (
    <>
      <div className="saludo">
        <h1>¡Hola, {nombreUsuario}!</h1>
        <p>Aquí tienes una vista general de tu sistema hoy.</p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 28,
          marginTop: 40
        }}
      >
        {[
          ['Google', <GoogleOutlined key="google" />, 'https://www.google.com'],
          ['Gmail', <MailOutlined key="gmail" />, 'https://mail.google.com'],
          ['ChatGPT', <RobotOutlined key="chatgpt" />, 'https://chatgpt.com'],
          ['Agenda', <CalendarOutlined key="agenda" />, 'https://calendar.google.com'],
          ['Calculadora', <CalculatorOutlined key="calculadora" />, 'https://www.calculadora.org'],
          ['WhatsApp', '💬', 'https://web.whatsapp.com'],
          ['Booking', <CarOutlined key="booking" />, 'https://www.booking.com'],
          ['Amazon', '🛒', 'https://www.amazon.es']
        ].map(([nombre, icono, url]) => (
          <Button
            key={nombre}
            type="primary"
            size="large"
            shape="circle"
            icon={icono}
            title={nombre}
            style={{
              width: 90,
              height: 90,
              fontSize: 30
            }}
            onClick={() =>
              window.open(url, '_blank', 'noopener,noreferrer')
            }
          />
        ))}
      </div>
    </>
  );

  // Pantallas ficticias para el usuario Demo
  const mostrarDemo = () => {
    const modulo = location.pathname.split('/').pop();

    const aviso = (
      <div
        style={{
          background: '#e9f4ff',
          border: '1px solid #c6e0f6',
          padding: 13,
          borderRadius: 8,
          marginBottom: 22
        }}
      >
        <strong>Modo demostración · Datos ficticios</strong>
        <p style={{ margin: '5px 0 0' }}>
          Puedes explorar el módulo, pero no se guardan
          cambios ni se realizan operaciones en MySQL.
        </p>
      </div>
    );

    if (modulo === 'trabajadores') {
      return (
        <div style={{ padding: 20 }}>
          <h1>Recursos Humanos</h1>
          {aviso}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18
            }}
          >
            {['Administrador', 'Contable', 'Agente'].map((puesto) => (
              <div key={puesto} style={tarjeta}>
                <h3>{puesto}</h3>

                {trabajadoresDemo
                  .filter((t) => t.puesto === puesto)
                  .map((t) => (
                    <p key={t.nombre}>
                      {t.nombre} — {t.ciudad}
                    </p>
                  ))}
              </div>
            ))}
          </div>

          <Button disabled>Añadir Trabajador</Button>
          {' '}
          <Button danger disabled>Eliminar Trabajador</Button>
        </div>
      );
    }

    if (modulo === 'regviajes') {
      return (
        <div style={{ padding: 20 }}>
          <h1>Gestión de Reservas</h1>
          {aviso}

          <div style={tarjeta}>
            <h2>Simulador de reserva</h2>

            <label>Cliente de ejemplo</label>
            <input
              style={campo}
              value={clienteDemo}
              onChange={(e) => setClienteDemo(e.target.value)}
            />

            <label>Destino</label>
            <select
              style={campo}
              value={destinoDemo}
              onChange={(e) => setDestinoDemo(e.target.value)}
            >
              <option>París</option>
              <option>Roma</option>
              <option>Londres</option>
              <option>Lisboa</option>
            </select>

            <p>
              <strong>Vista previa:</strong> Reserva ficticia
              para {clienteDemo || 'Cliente'} con destino
              a {` ${destinoDemo}`}.
            </p>

            <Button type="primary" disabled>
              Registrar Viaje (solo demostración)
            </Button>
          </div>

          <div style={tarjeta}>
            <h2>Reservas de ejemplo</h2>

            {reservasDemo.map((r) => (
              <p key={r.id}>
                <strong>{r.id}</strong> — {r.cliente} —{' '}
                {r.destino} — {formatoPrecio(r.total)}
              </p>
            ))}
          </div>
        </div>
      );
    }

    if (modulo === 'compras') {
      const cantidad = Number(cantidadDemo) || 0;
      const precio = Number(precioDemo) || 0;
      const total = cantidad * precio;

      return (
        <div style={{ padding: 20 }}>
          <h1>Gestión de Compras</h1>
          {aviso}

          <div style={tarjeta}>
            <h2>Calculadora de compras</h2>

            <label>Producto</label>
            <input
              style={campo}
              value="Billete de avión (ejemplo)"
              readOnly
            />

            <label>Cantidad</label>
            <input
              type="number"
              min="1"
              step="1"
              style={campo}
              value={cantidadDemo}
              onChange={(e) => setCantidadDemo(e.target.value)}
            />

            <label>Precio unitario (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              style={campo}
              value={precioDemo}
              onChange={(e) => setPrecioDemo(e.target.value)}
            />

            <h2 style={{ color: '#004080' }}>
              Total: {formatoPrecio(total)}
            </h2>

            <Button type="primary" disabled>
              Registrar Compra (solo demostración)
            </Button>
          </div>
        </div>
      );
    }

    if (modulo === 'facturas') {
      return (
        <div style={{ padding: 20 }}>
          <h1>Facturas de Reservas</h1>
          {aviso}

          <div style={tarjeta}>
            <h2>Reservas ficticias</h2>

            {reservasDemo.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #ddd'
                }}
              >
                <strong>{r.id}</strong>
                <p>Cliente: {r.cliente}</p>
                <p>Importe: {formatoPrecio(r.total)}</p>
                <p>Estado: {r.estado}</p>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <Button
                type="primary"
                onClick={generarPDFDemo}
              >
                Descargar PDF de demostración
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (modulo === 'lista') {
      return (
        <div style={{ padding: 20 }}>
          <h1>Planes y Compras</h1>
          {aviso}

          <div style={tarjeta}>
            <h2>Resumen ficticio</h2>
            <p>Compras de ejemplo: 2</p>
            <p>Reservas de ejemplo: 2</p>
            <p>Importe total de reservas: 1.470,00 €</p>
          </div>
        </div>
      );
    }

    if (modulo === 'soporteYayuda') {
      return (
        <div style={{ padding: 20 }}>
          <h1>Soporte y Ayuda</h1>
          {aviso}
          <div style={tarjeta}>
            <p>
              Esta es una demostración del ERP Novasoft.
              No se envían solicitudes de soporte reales.
            </p>
          </div>
        </div>
      );
    }

    // Inicio de la demo
    return (
      <div style={{ padding: 20 }}>
        <div className="saludo">
          <h1>Bienvenido a Novasoft Demo</h1>
          <p>
            Explora los módulos de nuestro ERP
            para agencias de viajes.
          </p>
        </div>

        {aviso}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 18
          }}
        >
          {[
            ['RRHH', 'trabajadores'],
            ['Reservas', 'regviajes'],
            ['Compras', 'compras'],
            ['Facturas', 'facturas']
          ].map(([nombre, ruta]) => (
            <div key={ruta} style={tarjeta}>
              <h3>{nombre}</h3>
              <p>
                Explora esta sección con datos ficticios.
              </p>
              <Button
                type="primary"
                onClick={() => navigate(`/principal/${ruta}`)}
              >
                Explorar módulo
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const rutaActual = location.pathname.split('/').pop();

  return (
    <Layout className="contenedor-principal">
      <Header className="menu-superior">
        <div className="logo-texto">
          <img
            src="/img/Logo.svg"
            alt="Logotipo"
            className="logo"
          />
          <span className="texto">
            Bienvenido, {nombreUsuario}
          </span>
        </div>

        <div className="cerrar-sesión">
          <div className="redes-sociales">
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <InstagramOutlined />
            </a>
            <a
              href="https://www.x.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            >
              <XOutlined />
            </a>
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FacebookOutlined />
            </a>
          </div>

          <Button type="primary" danger onClick={handleLogout}>
            <PoweroffOutlined /> Cerrar sesión
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider
          breakpoint="md"
          onBreakpoint={(pequena) => setCollapsed(pequena)}
          onCollapse={setCollapsed}
          width={collapsed ? 80 : 200}
          collapsible
          collapsed={collapsed}
          className={`menu-lateral ${collapsed ? 'collapsed' : ''}`}
        >
          <Menu
            selectedKeys={[
              location.pathname === '/principal'
                ? 'inicio'
                : rutaActual === 'soporteYayuda'
                  ? 'soporte'
                  : rutaActual
            ]}
            mode="inline"
            theme="dark"
            inlineCollapsed={collapsed}
            items={menuItems}
            onClick={handleMenuClick}
          />
        </Sider>

        <div
          className="flecha-menu"
          style={{ left: collapsed ? 80 : 200 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed
            ? <RightOutlined />
            : <LeftOutlined />}
        </div>

        <Layout className="contenido-principal">
          <Breadcrumb className="breadcrumb" />

          <Content className="content-box">
            {esDemo
              ? mostrarDemo()
              : location.pathname === '/principal'
                ? mostrarInicio()
                : <Outlet />}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default Principal;
