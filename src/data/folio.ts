// Folio corto y legible para el cliente, derivado del id de sesión de Stripe
// (cs_test_... / cs_live_...). Se calcula igual en el cliente y en el servidor.
// Usa los últimos 8 caracteres en mayúsculas y evita confusiones O/0 e I/L/1.
export function folioDesdeSesion(id: string | null | undefined): string {
  const limpio = String(id ?? '').split('_').pop() ?? ''
  const cola = limpio.slice(-8).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')
  if (cola.length < 8) return ''
  return `ED-${cola.slice(0, 4)}-${cola.slice(4)}`
}
