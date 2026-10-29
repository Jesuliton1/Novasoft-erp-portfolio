import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { enviarAutenticacion } from './apiAutenticacion.js';

export default function SolicitarRecuperacion() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const solicitar = async ({ correo }) => {
    setLoading(true); setResultado(null);
    try {
      const data = await enviarAutenticacion('/auth/password-reset/request', { correo });
      setResultado({ type: 'info', message: data.message });
    } catch (error) {
      setResultado({ type: 'error', message: error.message });
    } finally { setLoading(false); }
  };
  return (
    <Form className="formulario" onFinish={solicitar}>
      <Form.Item name="correo" label="E-mail" rules={[{ required: true, type: 'email', message: 'Ingrese un correo válido' }]}>
        <Input autoComplete="email" maxLength={255} />
      </Form.Item>
      {resultado && <Alert {...resultado} role="status" />}
      <Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>Aceptar</Button>
      </Form.Item>
    </Form>
  );
}
