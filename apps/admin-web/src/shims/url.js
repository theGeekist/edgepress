export function pathToFileURL(pathname = '') {
  const href = `file://${pathname}`;
  return {
    href,
    toString() {
      return href;
    }
  };
}

export function fileURLToPath(url = '') {
  if (typeof url !== 'string') return '';
  return url.replace(/^file:\/\//, '');
}

export default {
  pathToFileURL,
  fileURLToPath
};
