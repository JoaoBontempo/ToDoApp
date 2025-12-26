'use client';

import { useEffect, useState } from 'react';
import { DropResult, DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getToDos, createToDo, updateToDo, deleteToDo, ToDo, ToDoStatus, ToDoStatusDescription } from '@/lib/api';
import { Edit, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Home() {
  const [toDos, setToDos] = useState<ToDo[]>([]);
  const [editingToDo, setEditingToDo] = useState<ToDo | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    status: ToDoStatus.PENDING,
    finishedAt: null as Date | null | string
  });
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingToDoId, setDeletingToDoId] = useState<number | null>(null);

  useEffect(() => {
    fetchToDos();
  }, []);

  function toDateTimeLocal(value : Date | string | null | undefined) : string {
    if (!value) return '';

    const d = new Date(value);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }


  function formatDate(date : Date | string, log : boolean = false) : string {
    const formattedDate =
      new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '');

      if(log)
        console.log(formattedDate)
      return formattedDate;
  }


  async function fetchToDos() {
    try {
      const data = await getToDos();
      setToDos(data);
    } catch (error: any) {
      toast.error('Erro ao carregar tarefas: ' + error.message);
      setToDos([]);
    }
  }

  async function createOrUpdateToDo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const body = {
      id: editingToDo ? editingToDo.id : 0,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: editingToDo ? (formData.status as ToDoStatus) : ToDoStatus.PENDING,
      createdAt: editingToDo ? editingToDo.createdAt : new Date(),
      finishedAt: editingToDo 
        ? formData.finishedAt 
        : null
    };

    if (!body.title) {
      toast.error('O título é obrigatório!');
      return;
    }

    try {
      if (editingToDo) {
        await updateToDo(body);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await createToDo(body);
        toast.success('Tarefa criada com sucesso!');
      }
      await fetchToDos();
      closeModal();
    } catch (error: any) {
      toast.error('Erro ao salvar tarefa: ' + error.message);
    }
  }

  async function confirmDeleteToDo() {
    if (!deletingToDoId) return;

    try {
      await deleteToDo(deletingToDoId);
      toast.success('Tarefa excluída com sucesso!');
      await fetchToDos();
    } catch (error: any) {
      toast.error('Erro ao excluir tarefa: ' + error.message);
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingToDoId(null);
    }
  }

  function openDeleteModal(id: number) {
    setDeletingToDoId(id);
    setIsDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeletingToDoId(null);
  }

  function openModal(toDo?: ToDo) {
    if (toDo) {
      setEditingToDo(toDo);
      setFormData({
        title: toDo.title,
        description: toDo.description,
        status: toDo.status,
        finishedAt: toDo.finishedAt,
      });
    } else {
      setEditingToDo(null);
      setFormData({
        title: '',
        description: '',
        status: ToDoStatus.PENDING,
        finishedAt: null,
      });
    }
    setIsModalOpen(true);
    setTimeout(() => {
      const titleInput = document.getElementById('titulo') as HTMLInputElement;
      titleInput?.focus();
      titleInput?.select();
    }, 100);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingToDo(null);
    setFormData({ title: '', description: '', status: ToDoStatus.PENDING, finishedAt: null });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    console.log(name, value);
    setFormData(prev => ({
      ...prev,
      [name]: name === 'status' ? Number(value) : value
    }));
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    const ToDo = toDos.find(t => t.id === parseInt(result.draggableId));
    if (!ToDo) return;

    const newStatus = destination.droppableId === 'pendente' 
      ? ToDoStatus.PENDING
      : destination.droppableId === 'em_progresso' 
        ? ToDoStatus.IN_PROGRESS
        : ToDoStatus.FINISHED;

    if (ToDo.status === newStatus) return;

    const finishedAtDate = newStatus === ToDoStatus.FINISHED 
      ? new Date()
      : null;
    const updatedToDo = {
      ...ToDo,
      status: newStatus,
      finishedAt: ToDo.finishedAt == null || ToDo.finishedAt === ''
        ? toDateTimeLocal(finishedAtDate)
        : ToDo.finishedAt,
    };

    try {
      await updateToDo(updatedToDo);
      toast.success('Tarefa movida com sucesso!');
      await fetchToDos();
    } catch (error: any) {
      toast.error('Erro ao mover tarefa: ' + error.message);
    }
  }

  const columns = {
    pendente: toDos.filter(t => t.status === ToDoStatus.PENDING),
    em_progresso: toDos.filter(t => t.status === ToDoStatus.IN_PROGRESS),
    concluida: toDos.filter(t => t.status === ToDoStatus.FINISHED),
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster position="top-right" /> {}

      <header className="bg-green-500 text-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-3xl font-bold text-center">Gerenciador de Tarefas</h1>
      </header>

      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => openModal()} 
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          + Nova Tarefa
        </button>
        <div className="space-x-2">
          <button 
            onClick={() => setView('list')} 
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'list' 
                ? 'bg-gray-500 text-white shadow-md' 
                : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
            }`}
          >
            Lista
          </button>
          <button 
            onClick={() => setView('kanban')} 
            className={`px-4 py-2 rounded-lg transition-colors ${
              view === 'kanban' 
                ? 'bg-gray-500 text-white shadow-md' 
                : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
            }`}
          >
            Raias
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid gap-4">
            {toDos.map(ToDo => (
              <div key={ToDo.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 truncate">{ToDo.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{ToDo.description || 'Sem descrição'}</p>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p><span className="font-medium">Criado:</span> {formatDate(ToDo.createdAt)}</p>
                    {ToDo.finishedAt != null ? <p><span className="font-medium">Finalizado:</span> {ToDo.finishedAt ? formatDate(ToDo.finishedAt) : 'N/A'}</p> : <span></span>}
                    <p className={`font-medium ${getStatusColor(ToDo.status)}`}>
                      {ToDoStatusDescription[ToDo.status]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => openModal(ToDo)}
                    title="Editar"
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(ToDo.id)}
                    title="Excluir"
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(columns).map(([statusKey, columnToDos]) => {
              const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace('_', ' ');
              return (
                <Droppable droppableId={statusKey} key={statusKey}>
                  {provided => (
                    <div 
                      className="bg-white p-6 rounded-xl shadow-md min-h-[400px]" 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                    >
                      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2 flex items-center gap-2">
                        {statusLabel}
                        <span className="text-sm bg-gray-200 px-2 py-1 rounded-full">
                          {columnToDos.length}
                        </span>
                      </h2>
                      <div className="space-y-4 min-h-[200px]">
                        {columnToDos.map((ToDo, index) => (
                          <Draggable key={ToDo.id} draggableId={ToDo.id.toString()} index={index}>
                            {provided => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all cursor-grab active:cursor-grabbing"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <h3 className="font-bold text-lg text-gray-900 flex-1 min-w-0 pr-3 truncate">
                                    {ToDo.title}
                                  </h3>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openModal(ToDo)}
                                      title="Editar"
                                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-white rounded-lg transition-all -m-1.5"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(ToDo.id)}
                                      title="Excluir"
                                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-white rounded-lg transition-all -m-1.5"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-4 min-h-[40px] line-clamp-2">
                                  {ToDo.description || 'Sem descrição'}
                                </p>
                                <div className="text-xs text-gray-500 space-y-1">
                                  <p><span className="font-medium">Criado:</span> {formatDate(ToDo.createdAt)}</p>
                                  {ToDo.finishedAt != null ? <p><span className="font-medium">Finalizado:</span> {ToDo.finishedAt ? formatDate(ToDo.finishedAt) : 'N/A'}</p> : <span></span>}
                                </div>
                                <div className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusColor(ToDo.status)}`}>
                                  {ToDoStatusDescription[ToDo.status]}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {toDos.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold mb-2 text-gray-400">Nenhuma tarefa</h2>
          <p>Adicione sua primeira tarefa acima!</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingToDo ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
            </div>
            <form onSubmit={createOrUpdateToDo} className="p-6 space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                  Título *
                </label>
                <input 
                  id="titulo"
                  name="title"
                  type="text" 
                  value={formData.title} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg placeholder-gray-400"
                  placeholder="Digite o título da tarefa"
                  required 
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea 
                  id="descricao"
                  name="description"
                  value={formData.description} 
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-vertical placeholder-gray-400"
                  placeholder="Descreva a tarefa (opcional)"
                />
              </div>

              {editingToDo && (
                <div>
                  <label htmlFor="finishedAt" className="block text-sm font-semibold text-gray-700 mb-2">
                    Data de Finalização
                  </label>
                  <input 
                    id="finishedAt"
                    name="finishedAt"
                    type="datetime-local" 
                    value={formData.finishedAt != null ?  toDateTimeLocal(formData.finishedAt) : ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select 
                  id="status"
                  name="status"
                  value={formData.status} 
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  disabled={!editingToDo} // Desabilitado para nova tarefa
                >
                  <option value={ToDoStatus.PENDING}>Pendente</option>
                  <option value={ToDoStatus.IN_PROGRESS}>Em Progresso</option>
                  <option value={ToDoStatus.FINISHED}>Concluída</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all text-sm shadow-md"
                >
                  {editingToDo ? 'Atualizar' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={closeDeleteModal}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200" 
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-all text-sm"
              >
                Não, cancelar
              </button>
              <button
                onClick={confirmDeleteToDo}
                className="flex-1 px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all text-sm shadow-md"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: ToDoStatus) {
  if (status === ToDoStatus.PENDING) return 'text-yellow-600 bg-yellow-100';
  if (status === ToDoStatus.IN_PROGRESS) return 'text-orange-600 bg-orange-100';
  return 'text-green-600 bg-green-100';
}