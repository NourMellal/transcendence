import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string | number;
      username: string;
      email: string;
    };
  }
}

export async function createAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any ;   
    const user  = request.user  ;   
    if(!user)
             return reply.code(401).send({ message: 'Unauthenticated request.' }); 
        request.user =  {
      id: decoded.id || decoded.userId,
      username: decoded.username,
      email: decoded.email
    };

  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}
