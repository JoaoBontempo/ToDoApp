// src/lib/api.ts

export const ToDoStatusDescription = {
    0: 'Pendente',
    1: 'Em Progresso',
    2: 'Concluída',
}

export enum ToDoStatus {
  PENDING = 0,
  IN_PROGRESS = 1,
  FINISHED = 2,
}

export interface ToDo {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  finishedAt: string | null;
  status: ToDoStatus;
}

interface AppDefaultResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | null;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errBody: AppDefaultResponse = await response.json();
    const errorMsg = errBody.error || 'Erro desconhecido retornado pelo servidor';
    throw new Error(`${errorMsg} (Status: ${response.status})`);
  }

  const body: AppDefaultResponse<T> = await response.json();

  if (!body.success) {
    throw new Error(body.error || 'Erro desconhecido retornado pelo servidor');
  }

  if (body.data === undefined || body.data === null) {
    return {} as T;
  }

  return body.data;
}

export async function getToDos(): Promise<ToDo[]> {
  const res = await fetch('/api/todo', { cache: 'no-store' });
  return handleResponse<ToDo[]>(res);
}

export async function createToDo(
  toDo: Omit<ToDo, 'id' | 'createdAt' | 'finishedAt'>
): Promise<ToDo> {
  const res = await fetch('/api/todo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toDo),
  });
  return handleResponse<ToDo>(res);
}

export async function updateToDo(toDo: ToDo): Promise<void> {
    console.log(JSON.stringify({
      ...toDo,
      finishedAt: toDo.finishedAt ?? toDo.status === ToDoStatus.FINISHED ? new Date().toISOString() : null,
    }))
  const res = await fetch(`/api/todo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...toDo,
      finishedAt: toDo.finishedAt ?? toDo.status === ToDoStatus.FINISHED ? new Date().toISOString() : null,
    }),
  });
  await handleResponse<void>(res);
}

export async function deleteToDo(id: number): Promise<void> {
  const res = await fetch(`/api/todo?id=${id}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(res);
}