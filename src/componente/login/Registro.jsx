import { useState } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import { Link, useNavigate } from "react-router-dom";
import { enviarAutenticacion } from './apiAutenticacion.js';


// Componente de registro
const Registro = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Función para manejar el envío del formulario
  const onFinish = async (values) => {
    setLoading(true);
    try {
      await enviarAutenticacion('/register', {
          nombre: values.nombre,
          dni: values.dni, 
          contraseña: values.contraseña,
          correo: values.email,
          telefono: values.telefono,
          ciudad: values.ciudad,
          pais: values.pais,
      });
        alert('Usuario registrado correctamente');
        navigate("/");
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fondo">
      <div className="contenedorR">
        <Form className="formulario" name="register" onFinish={onFinish}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Ingrese su nombre' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="dni" label="DNI" rules={[{ required: true, message: 'Ingrese su DNI' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="contraseña" label="Contraseña" rules={[{ required: true, min: 12, message: 'Ingrese al menos 12 caracteres' }]} hasFeedback>
            <Input.Password />
          </Form.Item>

          <Form.Item name="confirmar" label="Conf. Contraseña" dependencies={['contraseña']} hasFeedback rules={[
            { required: true, message: 'Confirme su contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('contraseña') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}>
            <Input.Password />
          </Form.Item>

          <Form.Item name="email" label="E-mail" rules={[{ type: 'email', required: true, message: 'Ingrese un correo válido' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="telefono" label="Teléfono" rules={[{ required: true, message: 'Ingrese su número de teléfono' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="ciudad" label="Ciudad" rules={[{ required: true, message: 'Ingrese una ciudad' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="pais" label="País" rules={[{ required: true, message: 'Ingrese un país' }]}>
            <Input />
          </Form.Item>

          <Form.Item>
            <Checkbox>Acepto los <a href="#">Términos y Condiciones</a></Checkbox>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Registrar</Button>
          </Form.Item>

          <div style={{ textAlign: "center"}}>
            ¿Ya tienes cuenta? <Link to="/">Inicia sesión aquí</Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Registro;
