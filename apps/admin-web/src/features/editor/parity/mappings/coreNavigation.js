function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeOrientation(value) {
  return String(value || '').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
}

function normalizeMenuItemKind(value) {
  return String(value || '').toLowerCase() === 'external' ? 'external' : 'internal';
}

function toObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function toItemId(value, fallback) {
  return String(value || fallback);
}

function toItemLabel(value, fallbackIndex) {
  return String(value || '').trim() || `Item ${fallbackIndex + 1}`;
}

function normalizeFallbackItem(entry, index, parentId, fallbackId) {
  const kind = normalizeMenuItemKind(entry.kind);
  const target = String(entry.target || '_self').trim() || '_self';
  return {
    id: toItemId(entry.id, fallbackId),
    label: toItemLabel(entry.label, index),
    kind,
    route: kind === 'internal' ? String(entry.route || '').trim() : '',
    documentId: kind === 'internal' ? String(entry.documentId || '').trim() : '',
    externalUrl: kind === 'external' ? String(entry.externalUrl || '').trim() : '',
    order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
    parentId: parentId || String(entry.parentId || '').trim() || null,
    target,
    rel: String(entry.rel || '').trim()
  };
}

function normalizeFallbackItems(input) {
  const list = [];
  const walk = (items, parentId) => {
    const source = Array.isArray(items) ? items : [];
    for (let index = 0; index < source.length; index += 1) {
      const entry = toObject(source[index]);
      const item = normalizeFallbackItem(entry, index, parentId, `nav_item_${list.length + 1}`);
      list.push(item);
      if (Array.isArray(entry.children) && entry.children.length) {
        walk(entry.children, item.id);
      }
    }
  };

  walk(input, null);
  return list;
}

function menuItemFromNavigationLink(attrs, index, parentId) {
  const rawKind = String(attrs.kind || '').toLowerCase();
  const isExternal = rawKind === 'custom' || rawKind === 'external';
  const kind = isExternal ? 'external' : 'internal';
  const id = String(attrs.menuItemId || attrs.id || `nav_item_${parentId || 'root'}_${index}`);
  const url = String(attrs.url || '').trim();
  return {
    id,
    label: String(attrs.label || attrs.title || '').trim() || `Item ${index + 1}`,
    kind,
    route: kind === 'internal' ? String(attrs.route || url).trim() : '',
    documentId: kind === 'internal' ? String(attrs.documentId || attrs.id || '').trim() : '',
    externalUrl: kind === 'external' ? url : '',
    order: Number.isFinite(Number(attrs.order)) ? Number(attrs.order) : index,
    parentId: parentId || null,
    target: String(attrs.target || '_self').trim() || '_self',
    rel: String(attrs.rel || '').trim()
  };
}

function fallbackItemsFromWpNavigationNode(node) {
  const items = [];
  const walkLinks = (blocks, parentId) => {
    const source = Array.isArray(blocks) ? blocks : [];
    for (let index = 0; index < source.length; index += 1) {
      const block = toObject(source[index]);
      const attrs = toObject(block.attributes);
      if (block.name !== 'core/navigation-link') continue;
      const item = menuItemFromNavigationLink(attrs, index, parentId);
      items.push(item);
      walkLinks(block.innerBlocks, item.id);
    }
  };

  walkLinks(node?.innerBlocks, null);
  return items;
}

function buildMenuTree(items) {
  const normalized = normalizeFallbackItems(items)
    .slice()
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const byId = new Map();
  for (const item of normalized) {
    byId.set(item.id, { ...item, children: [] });
  }
  const roots = [];
  for (const item of normalized) {
    const current = byId.get(item.id);
    if (!current) continue;
    if (item.parentId && byId.has(item.parentId) && item.parentId !== item.id) {
      byId.get(item.parentId).children.push(current);
    } else {
      roots.push(current);
    }
  }
  return roots;
}

function getHrefForItem(item) {
  if (item.kind === 'external') {
    return String(item.externalUrl || '').trim();
  }
  return String(item.route || '').trim() || (item.documentId ? `/documents/${item.documentId}` : '');
}

function renderNavigationItemsHtml(items, options) {
  const showSubmenuIndicators = options.showSubmenuIndicators !== false;
  const nodes = Array.isArray(items) ? items : [];
  return nodes.map((item) => {
    const href = getHrefForItem(item);
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const targetAttr = item.target && item.target !== '_self' ? ` target="${escapeHtml(item.target)}"` : '';
    const relAttr = item.rel ? ` rel="${escapeHtml(item.rel)}"` : '';
    const indicator = hasChildren && showSubmenuIndicators
      ? '<span class="wp-block-navigation__submenu-icon" aria-hidden="true">▾</span>'
      : '';
    const childMarkup = hasChildren
      ? `<ul class="wp-block-navigation__submenu-container">${renderNavigationItemsHtml(item.children, options)}</ul>`
      : '';
    return `<li class="wp-block-navigation-item${hasChildren ? ' has-child' : ''}"><a class="wp-block-navigation-item__content" href="${escapeHtml(href || '#')}"${targetAttr}${relAttr}>${escapeHtml(item.label)}${indicator}</a>${childMarkup}</li>`;
  }).join('');
}

function resolveMenuSnapshotItems(menuId, context) {
  const sourceRevisionSet = toObject(context?.sourceRevisionSet);
  let menus = [];
  if (Array.isArray(sourceRevisionSet.menus)) {
    menus = sourceRevisionSet.menus;
  } else if (Array.isArray(context?.menus)) {
    menus = context.menus;
  }
  const menu = menus.find((entry) => {
    const current = toObject(entry);
    return String(current.id || '') === menuId || String(current.key || '') === menuId;
  });
  if (!menu || !Array.isArray(menu.items)) {
    return [];
  }
  return normalizeFallbackItems(menu.items);
}

function resolveShowSubmenuIndicators(attrs) {
  if (attrs.showSubmenuIndicators !== undefined) {
    return Boolean(attrs.showSubmenuIndicators);
  }
  if (attrs.showSubmenuIcon !== undefined) {
    return Boolean(attrs.showSubmenuIcon);
  }
  return true;
}

function buildEditorNavigationLinkBlocks(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    name: 'core/navigation-link',
    attributes: {
      label: item.label,
      kind: item.kind === 'external' ? 'custom' : 'post-type',
      url: getHrefForItem(item),
      id: item.documentId || item.id,
      menuItemId: item.id,
      target: item.target,
      rel: item.rel
    },
    innerBlocks: buildEditorNavigationLinkBlocks(item.children)
  }));
}

export const navigationImportTransform = {
  id: 'core.navigation.import.v1',
  priority: 100,
  wpBlockNames: ['core/navigation'],
  canHandle: () => true,
  toCanonical({ wpBlockName, node }) {
    const attrs = toObject(node?.attributes);
    const fallbackItems = Array.isArray(attrs.fallbackItems) && attrs.fallbackItems.length > 0
      ? normalizeFallbackItems(attrs.fallbackItems)
      : fallbackItemsFromWpNavigationNode(node);
    const orientation = normalizeOrientation(attrs?.layout?.orientation || attrs.orientation);
    const showSubmenuIndicators = resolveShowSubmenuIndicators(attrs);
    return {
      blockKind: 'ep/navigation',
      props: {
        menuId: String(attrs.menuId || attrs.ref || '').trim(),
        fallbackItems,
        orientation,
        showSubmenuIndicators,
        style: attrs.style && typeof attrs.style === 'object' ? attrs.style : {}
      },
      origin: {
        wpBlockName,
        attrs,
        innerHTML: typeof node?.innerHTML === 'string' ? node.innerHTML : ''
      },
      lossiness: 'none',
      children: []
    };
  }
};

const navigationRenderer = {
  id: 'ep.navigation.render.v1',
  priority: 100,
  blockKinds: ['ep/navigation'],
  targets: ['publish', 'preview', 'editor'],
  canHandle: () => true,
  render({ target, node, context }) {
    const props = toObject(node?.props);
    const menuId = String(props.menuId || '').trim();
    const fallbackItems = normalizeFallbackItems(props.fallbackItems);
    const snapshotItems = menuId ? resolveMenuSnapshotItems(menuId, context) : [];
    const activeItems = snapshotItems.length > 0 ? snapshotItems : fallbackItems;
    const tree = buildMenuTree(activeItems);
    const orientation = normalizeOrientation(props.orientation);
    const showSubmenuIndicators = props.showSubmenuIndicators !== false;

    if (target === 'editor') {
      return {
        name: 'core/navigation',
        attributes: {
          ref: menuId || undefined,
          menuId: menuId || undefined,
          fallbackItems,
          layout: { type: 'flex', orientation },
          showSubmenuIcon: showSubmenuIndicators,
          style: props.style && typeof props.style === 'object' ? props.style : {}
        },
        innerBlocks: buildEditorNavigationLinkBlocks(tree)
      };
    }

    const classNames = [
      'wp-block-navigation',
      'ep-navigation',
      orientation === 'vertical' ? 'is-vertical' : 'is-horizontal'
    ].join(' ');
    const itemsMarkup = renderNavigationItemsHtml(tree, { showSubmenuIndicators });
    return `<nav class="${classNames}" aria-label="Navigation"><ul class="wp-block-navigation__container">${itemsMarkup}</ul></nav>`;
  }
};

export const navigationRenderers = [navigationRenderer];
