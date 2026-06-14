/**
 * Helper para limpiar usuarios de prueba del backend.
 * 
 * El backend usa Supabase Auth, no hay un endpoint público de borrado.
 * Este helper intenta patrones comunes. Si no funciona, no falla.
 * 
 * Para activar la limpieza real, configurá CLEANUP_API_URL en GitHub Secrets
 * apuntando a un endpoint que acepte: DELETE /users/{email}
 */

import { request } from '@playwright/test';

const API_BASE = process.env.CLEANUP_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://closetly-be.vercel.app/api';

export async function deleteTestUser(email: string): Promise<boolean> {
  const api = await request.newContext();
  
  const endpoints = [
    { url: `${API_BASE}/test/cleanup`, method: 'DELETE' as const },
    { url: `${API_BASE}/auth/cleanup`, method: 'DELETE' as const },
    { url: `${API_BASE}/test/users`, method: 'DELETE' as const },
  ];

  for (const { url, method } of endpoints) {
    try {
      const response = await api.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        data: { email },
      });

      if (response.ok()) {
        console.log(`🧹 Usuario ${email} eliminado via ${url}`);
        await api.dispose();
        return true;
      }
    } catch {
      // Endpoint no existe o error, probar siguiente
    }
  }

  console.log(`⚠️ No se pudo limpiar ${email} — ningún endpoint de cleanup disponible`);
  console.log(`   Para activarlo, crear endpoint DELETE en el BE que acepte { email }`);
  await api.dispose();
  return false;
}
