let openModalCount = 0;

export function incrementModalCount() {
  openModalCount++;
}

export function decrementModalCount() {
  openModalCount = Math.max(0, openModalCount - 1);
}

export function getOpenModalCount() {
  return openModalCount;
}
