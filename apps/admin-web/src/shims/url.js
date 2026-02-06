export function pathToFileURL(pathname = '') {
  return {
    toString() {
      return `file://${pathname}`;
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
