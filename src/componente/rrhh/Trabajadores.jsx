
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button } from 'antd';
import './trabajadores.css';
import api from '../../services/api';

const { Option } = Select;

const Trabajadores = () => {
  const [trabajadores, setTrabajadores] = useState({
    administradores: [],
    contables: [],
    agentes: []
  });

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [form] = Form.useForm();

  // Obtener trabajadores desde el backend
  const obtenerTrabajadores = async () => {
    try {
      const respuesta = await api.get('/trabajadores');
      const { administradores, contables, agentes } = respuesta.data;

      setTrabajadores({
        administradores: administradores || [],
        contables: contables || [],
        agentes: agentes || []
      });
    } catch {
      console.error('Error al obtener trabajadores:');
      alert('No se pudieron cargar los trabajadores');
    }
  };

  useEffect(() => {
    obtenerTrabajadores();
  }, []);

  // Eliminar trabajador seleccionado
  const eliminarTrabajador = async (id) => {
    if (!id) {
      alert('Selecciona un trabajador para eliminar.');
      return;
    }

    const confirmar = window.confirm(
      '¿Seguro que quieres eliminar este trabajador?'
    );

    if (!confirmar) return;

    try {
      await api.delete(`/usuarios/trabajadores/${id}`);

      alert('Trabajador eliminado correctamente');
      setTrabajadorSeleccionado(null);
      await obtenerTrabajadores();
    } catch (error) {
      console.error('Error al eliminar trabajador:');

      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Error al eliminar trabajador'
      );
    }
  };

  // Añadir nuevo trabajador
  const añadirTrabajador = async (valores) => {
    setCargando(true);

    try {
      const respuesta = await api.post('/trabajadores', valores);

      if (respuesta.status === 201) {
        alert('Trabajador añadido correctamente');
        form.resetFields();
        setMostrarModal(false);
        await obtenerTrabajadores();
      }
    } catch (error) {
      console.error('Error al añadir trabajador:');

      alert(
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Error al añadir trabajador'
      );
    } finally {
      setCargando(false);
    }
  };

  const cerrarModal = () => {
    if (cargando) return;

    setMostrarModal(false);
    form.resetFields();
  };

  return (
    <div className="contendor-trabajadores">
      <h2 className="rrhh1">Listado de Trabajadores</h2>

      <div className="trabajadores-grid">
        {['administradores', 'contables', 'agentes'].map((categoria) => (
          <div className="trabajadores" key={categoria}>
            <h3>
              {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
            </h3>

            {trabajadores[categoria].length === 0 ? (
              <p>No hay trabajadores en esta categoría.</p>
            ) : (
              <ul>
                {trabajadores[categoria].map((trabajador) => (
                  <li
                    key={trabajador.idUsuario}
                    onClick={() =>
                      setTrabajadorSeleccionado(trabajador.idUsuario)
                    }
                    className={
                      trabajadorSeleccionado === trabajador.idUsuario
                        ? 'seleccionado'
                        : ''
                    }
                  >
                    {trabajador.nombre} - {trabajador.ciudad} - {trabajador.telefono}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="botones-trabajadores">
        <button
          className="btn-add"
          onClick={() => setMostrarModal(true)}
        >
          Añadir Trabajador
        </button>

        <button
          className="btn-delete"
          onClick={() => eliminarTrabajador(trabajadorSeleccionado)}
          disabled={!trabajadorSeleccionado}
        >
          Eliminar Trabajador
        </button>
      </div>

      <Modal
        title="Añadir Trabajador"
        open={mostrarModal}
        onCancel={cerrarModal}
        footer={null}
        className="modal-trabajador"
        destroyOnHidden
        centered
        width={550}
        maskClosable={!cargando}
        styles={{
          body: {
            maxHeight: '65vh',
            overflowY: 'auto',
            overflowX: 'hidden'
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={añadirTrabajador}
          className="form-trabajador-modal"
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[
              { required: true, whitespace: true, message: 'Ingrese el nombre del trabajador' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="dni"
            label="DNI"
            rules={[
              { required: true, message: 'Ingrese el DNI del trabajador' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="contraseña"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingrese una contraseña' },
              {
                min: 12,
                max: 72,
                message: 'La contraseña debe tener entre 12 y 72 caracteres'
              }
            ]}
            hasFeedback
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="correo"
            label="Correo"
            rules={[
              {
                type: 'email',
                required: true,
                message: 'Ingrese un correo válido'
              }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="telefono"
            label="Teléfono"
            rules={[
              { required: true, message: 'Ingrese un número de teléfono' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="ciudad"
            label="Ciudad"
            rules={[
              { required: true, message: 'Ingrese una ciudad' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="pais"
            label="País"
            rules={[
              { required: true, message: 'Ingrese un país' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="idClase"
            label="Puesto de trabajo"
            rules={[
              {
                required: true,
                message: 'Seleccione el puesto del trabajador'
              }
            ]}
          >
            <Select placeholder="Selecciona un puesto">
              <Option value="2">Contable</Option>
              <Option value="3">Agente</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={cargando}
            >
              Añadir Trabajador
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Trabajadores;
