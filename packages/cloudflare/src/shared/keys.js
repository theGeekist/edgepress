export function appKey(...parts) {
  return `app:${parts.join(':')}`;
}

export function kvIndexAdd(kvGetJson, kvPutJson) {
  return async function kvIndexAddFn(key, value) {
    const items = (await kvGetJson(key)) || [];
    if (items.includes(value)) return;
    items.push(value);
    await kvPutJson(key, items);
  };
}

export function kvIndexRemove(kvGetJson, kvPutJson) {
  return async function kvIndexRemoveFn(key, value) {
    const items = (await kvGetJson(key)) || [];
    await kvPutJson(
      key,
      items.filter((entry) => entry !== value)
    );
  };
}

export function kvSeedUser(appKey, kvPutJson, kvPutString) {
  return async function kvSeedUserFn(user, kvIndexAddFn) {
    await kvPutJson(appKey('user', user.id), user);
    await kvPutString(appKey('user_by_username', user.username), user.id);
    await kvIndexAddFn(appKey('users'), user.id);
  };
}
