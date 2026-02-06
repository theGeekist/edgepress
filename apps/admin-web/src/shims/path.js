export function dirname() {
  return '';
}

export function join(...parts) {
  return parts.filter(Boolean).join('/');
}

export function isAbsolute(pathname = '') {
  return pathname.startsWith('/');
}

export function resolve(...parts) {
  return join(...parts);
}

export default {
  dirname,
  join,
  isAbsolute,
  resolve
};
