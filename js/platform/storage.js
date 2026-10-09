export async function requestPersist() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageStatus() {
  try {
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    const est = await navigator.storage?.estimate?.();
    return { persisted, usedMb: est ? (est.usage / 1048576).toFixed(1) : '?' };
  } catch {
    return { persisted: false, usedMb: '?' };
  }
}
