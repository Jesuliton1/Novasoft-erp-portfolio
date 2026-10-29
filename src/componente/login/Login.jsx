import { useState } from 'react';
import './estilos.css'; 
import { LockOutlined, UserOutlined, XOutlined, InstagramOutlined, FacebookOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Modal } from 'antd';
import { Link, useNavigate } from "react-router-dom"; 
import axios from 'axios';
import SolicitarRecuperacion from './SolicitarRecuperacion.jsx';
import { salirDemoLocal } from '../../sesion.js';
import { urlApiAutenticacion } from './apiAutenticacion.js';

// Componente de inicio de sesión
const Login = () => {
  const [loading, setLoading] = useState(false);
  const [recuperacionAbierta, setRecuperacionAbierta] = useState(false);
  const navigate = useNavigate(); 

  // Función para manejar el envío del formulario
  const onFinish = async (valores) => {
    setLoading(true);
  
    try {
      
const API_URL = urlApiAutenticacion();

const respuesta = await axios.post(`${API_URL}/login`, {

        usuario: valores.usuario,
        password: valores.password
      }, { timeout: 20000 });
      
  

if (respuesta.data.message === 'Login exitoso' && respuesta.data.token) {
  salirDemoLocal();
  sessionStorage.setItem('token', respuesta.data.token);

  navigate('/principal', {
    state: { usuario: respuesta.data.usuario.nombre }
  });

      } else {
        alert('Credenciales incorrectas');
      }
  
    } catch (error) {
      alert(error.response?.data?.message || 'Error al intentar iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fondo">
      <div className="contenedorLI">
        <div className="textoLI">
          <h1>Bienvenido, soluciones empresariales a tu alcance.</h1>
          <h2>
            En Novasoft, te ofrecemos un ERP intuitivo que optimiza la gestión de tu negocio, ayudándote a tomar 
            decisiones informadas y mejorar la eficiencia. Inicia sesión para continuar y descubrir más.
          </h2>
          <br />
          <div className="iconos">
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
              <InstagramOutlined />
            </a>
            <a href="https://www.x.com" target="_blank" rel="noopener noreferrer">
              <XOutlined />
            </a>
            <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
              <FacebookOutlined />
            </a>
          </div>
        </div>
      </div>

      <div className="contenedorLD">
        <Form
          className="formulario" 
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="usuario"
            rules={[{ required: true, message: '¡Por favor ingrese su nombre de usuario!' }]}>
            <Input prefix={<UserOutlined />} placeholder="Nombre de usuario" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '¡Por favor ingrese su contraseña!' }]}>
            <Input prefix={<LockOutlined />} type="password" placeholder="Contraseña" />
          </Form.Item>

          <Form.Item>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Form.Item name="recordar" valuePropName="checked" noStyle>
                <Checkbox>Recordar</Checkbox>
              </Form.Item>
              <a href="#recuperacion" onClick={(event) => {
                event.preventDefault();
                setRecuperacionAbierta(true);
              }}>¿Has olvidado tu contraseña?</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button block type="primary" htmlType="submit" loading={loading}>
              Aceptar
            </Button>
            <Button 
              block 
              type="default" 
              style={{ marginTop: 10 }} 
              onClick={() => navigate('/')}> 
              Cancelar
            </Button>
            <Button
              block
              type="default"
              htmlType="button"
              style={{ marginTop: 10 }}
              onClick={() => navigate('/demo')}>
              Entrar en modo Demo
            </Button>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              o <Link to="/registro">¡Regístrate ahora!</Link>
            </div>
          </Form.Item>
        </Form>
      </div>
      <Modal className="recuperacion-modal" title="Recuperación de contraseña" open={recuperacionAbierta}
        onCancel={() => setRecuperacionAbierta(false)} footer={null} destroyOnClose>
        <SolicitarRecuperacion />
      </Modal>
    </div>  
  );
};

export default Login;
