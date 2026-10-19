// Mensaje de WhatsApp de la promo: dice las horas que REALMENTE le quedan a esa persona (la cuenta regresiva que ve en el banner), no un número fijo.
// {horas} se reemplaza por "N horas" (se redondea para abajo: nunca se promete más tiempo del que queda). Si ya terminó, usa mensajeWaFin.
export function horasRestantesTexto(ms) {
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return h + (h === 1 ? ' hora' : ' horas');
  return 'menos de 1 hora';
}
export function mensajePromoWa(promo, resta) {
  if (resta === 0) return promo.mensajeWaFin;
  if (resta == null || !promo.mensajeWa.includes('{horas}')) return promo.mensajeWa.replace(' de {horas}', '').replace('{horas}', '');
  return promo.mensajeWa.replace('{horas}', horasRestantesTexto(resta));
}
