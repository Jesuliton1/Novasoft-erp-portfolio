import { useState } from 'react';
import { Button, Modal, Form, Input, Typography, Collapse } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './soporteYayuda.css';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

const Soporte = () => {
  const [abierto, setAbierto] = useState(false);

  const abrir = () => setAbierto(true);
  const cerrar = () => setAbierto(false);

  const enviar = () => {
    setAbierto(false);
  };

  return (
    <div className="ayuda">
      <Title level={2}>Centro de Ayuda y Soporte</Title>
      <Collapse accordion className="faq-section">
        <Panel header="¿Cómo agregar un nuevo usuario?" key="1">
          <Paragraph>
            En un entorno local configurado, el administrador puede crear contables y agentes desde RRHH. La demo no permite altas.
          </Paragraph>
        </Panel>
        <Panel header="¿Cómo generar un informe?" key="2">
          <Paragraph>
            La demo permite descargar un PDF ficticio desde Facturas. No incorpora un módulo general de informes.
          </Paragraph>
        </Panel>
        <Panel header="¿Puedo modificar los permisos de un usuario?" key="3">
          <Paragraph>
            Los permisos se validan en la API. No existe un editor de permisos en esta versión.
          </Paragraph>
        </Panel>
      </Collapse>
      <Button type="primary" icon={<QuestionCircleOutlined />} onClick={abrir} className="btn-ayuda">
        Ver formulario de ejemplo (sin envío)
      </Button>
      <Modal
        title="Formulario de ejemplo: no envía mensajes"
        open={abierto}
        onCancel={cerrar}
        footer={null}
        className="modal-soporte"
      >
        <Form layout="vertical" onFinish={enviar} className="form-soporte">
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: 'Por favor, introduce tu nombre' }]}
          >
            <Input placeholder="Tu nombre" />
          </Form.Item>
          <Form.Item
            label="Correo"
            name="correo"
            rules={[
              { required: true, message: 'Por favor, introduce tu correo electrónico' },
              { type: 'email', message: 'Introduce un correo válido' },
            ]}
          >
            <Input placeholder="Tu correo electrónico" />
          </Form.Item>
          <Form.Item
            label="Mensaje"
            name="mensaje"
            rules={[{ required: true, message: 'Por favor, introduce tu mensaje' }]}
          >
            <Input.TextArea rows={4} placeholder="Escribe tu mensaje aquí" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="btn-enviar">
              Cerrar ejemplo
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Soporte;
