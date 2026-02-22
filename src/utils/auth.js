// Simple client-side auth using localStorage (for demo only)
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function loadUsers() {
  try {
    const raw = localStorage.getItem('users') || '{}';
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

export async function register(email, password) {
  const users = loadUsers();
  if (users[email]) throw new Error('User exists');
  const hash = await hashPassword(password);
  users[email] = { passwordHash: hash, data: { portfolio: [] } };
  saveUsers(users);
  localStorage.setItem('currentUser', email);
  return { email };
}

export async function login(email, password) {
  const users = loadUsers();
  const user = users[email];
  if (!user) throw new Error('No such user');
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) throw new Error('Invalid credentials');
  localStorage.setItem('currentUser', email);
  return { email };
}

export function logout() {
  localStorage.removeItem('currentUser');
}

export function getCurrentUser() {
  return localStorage.getItem('currentUser');
}

export function getUserData(email, key) {
  const users = loadUsers();
  const u = users[email];
  if (!u) return null;
  return u.data?.[key] ?? null;
}

export function setUserData(email, key, value) {
  const users = loadUsers();
  const u = users[email] || { passwordHash: null, data: {} };
  u.data = u.data || {};
  u.data[key] = value;
  users[email] = u;
  saveUsers(users);
}

const authObject = {
  register, login, logout, getCurrentUser, getUserData, setUserData
};

export default authObject;
