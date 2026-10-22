const DATABASE_NAME = 'thawin-portfolio';
const DATABASE_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('เปิดฐานข้อมูลผลงานไม่สำเร็จ'));
    request.onblocked = () => reject(new Error('ฐานข้อมูลกำลังถูกใช้งาน กรุณาปิดแท็บอื่นแล้วลองใหม่'));
  });
}

function runTransaction(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('ดำเนินการกับข้อมูลผลงานไม่สำเร็จ'));
    transaction.onabort = () => reject(transaction.error ?? new Error('บันทึกข้อมูลผลงานไม่สำเร็จ'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  }));
}

export function getProjects() {
  return runTransaction('readonly', (store) => store.getAll())
    .then((projects) => projects.sort((first, second) => second.createdAt.localeCompare(first.createdAt)));
}

export function saveProject(project) {
  return runTransaction('readwrite', (store) => store.put(project));
}

export function deleteProject(id) {
  return runTransaction('readwrite', (store) => store.delete(id));
}
