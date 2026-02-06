import { useState } from 'react';

export function useAuthState(shell) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [user, setUser] = useState(shell.session.user || null);

  async function login() {
    const account = await shell.login(username, password);
    setUser(account);
    return account;
  }

  async function logout() {
    await shell.logout();
    setUser(null);
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    user,
    setUser,
    login,
    logout
  };
}
