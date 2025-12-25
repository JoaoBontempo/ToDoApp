// pages/api/todo/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = 'https://localhost:7085/todo';

type ErrorResponse = {
  error: string;
  details?: string;
  tip?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ErrorResponse>
) {
  const { method, query } = req;
  const id = query.id as string | undefined;

  let url = BACKEND_URL;
  if (id) url = `${BACKEND_URL}/${id}`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST', 'PATCH'].includes(method!) ? JSON.stringify(req.body) : undefined,
    });

    // Log de sucesso
    console.log(`[${method}] Resposta do backend: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }

    if (method === 'DELETE') {
      return res.status(200).json({ success: true });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    // Melhoria principal: mensagem clara e útil
    console.error('Erro completo na conexão com o backend:', error);

    let friendlyMessage = 'Falha na conexão com o servidor de tarefas';
    let tip = '';

    if (error.message?.includes('self-signed certificate') || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      friendlyMessage = 'Certificado SSL autoassinado rejeitado';
      tip = 'Rode "dotnet dev-certs https --trust" no terminal como Administrador e reinicie tudo';
    } else if (error.message?.includes('fetch failed') || error.type === 'system') {
      friendlyMessage = 'Não foi possível conectar ao backend .NET';
      tip = 'Verifique se o servidor .NET está rodando[](https://localhost:7085/todo). Teste no Postman ou navegador.';
    } else if (error.message?.includes('ECONNREFUSED')) {
      friendlyMessage = 'Conexão recusada';
      tip = 'O servidor .NET não está rodando ou está em outra porta';
    }

    return res.status(502).json({
      error: friendlyMessage,
      details: error.message || String(error),
      tip,
    });
  }
}