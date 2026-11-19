export type IconName =
  | 'fingerprint'
  | 'cookie'
  | 'profiles'
  | 'settings'
  | 'plus'
  | 'search'
  | 'chevron'
  | 'chevrons'
  | 'play'
  | 'stop'
  | 'spinner'
  | 'more'
  | 'refresh'
  | 'check'
  | 'alert'
  | 'download'
  | 'close'
  | 'folder'
  | 'sortAsc'
  | 'sortDesc'
  | 'upload'
  | 'columns'
  | 'prev'
  | 'next'
  | 'tick'
  | 'copy'
  | 'info'
  | 'ring'
  | 'groups'
  | 'proxies'
  | 'extensions'
  | 'automation'
  | 'sync'
  | 'trash'
  | 'edit'
  | 'external'
  | 'eye'
  | 'eyeOff'
  | 'star'
  | 'starFilled'
  | 'panelCollapse'
  | 'panelExpand'
  | 'selectArea'
  | 'hand'
  | 'groupNodes'
  | 'ungroupNodes'
  | 'undo'
  | 'redo'
  | 'alignNodes'
  | 'journal'
  | 'save'
  | 'paste'
  | 'mouse'
  | 'keyboard'
  | 'clock'
  | 'shield'
  | 'megaphone'
  | 'moveToFolder'
  | 'cookieExport'
  | 'deselect'

export interface IconShape {
  body: string
  filled?: boolean
  stroke?: number
}

/** Контур папки: у «Папки» и «Групп» один. */
const FOLDER = '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'

export const ICONS: Record<IconName, IconShape> = {
  eye: { body: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' },
  eyeOff: { body: '<path d="M3 3l18 18M10.6 5.1L12 5c6.5 0 10 7 10 7a20 20 0 0 1-3 3.9M6.5 6.5A20 20 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.5-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' },
  fingerprint: { body: '<path d="M4 10a8 8 0 0 1 16 0M7 10a5 5 0 0 1 10 0v3c0 3-1 5.5-3 8M10 10a2 2 0 0 1 4 0v3c0 3-1 5-3 7M4 13v1c0 2-.5 4-1 5M7 13c0 3-.5 5-1.5 7M10 13c0 2-.2 4-1 6M20 13c0 3-.4 5-1 7"/>' },
  cookie: { body: '<path d="M20.4 12.5A8.5 8.5 0 1 1 11.5 3 4 4 0 0 0 16 7a4 4 0 0 0 4.4 5.5z"/><path d="M8 8h.01M7 14h.01M12 17h.01M14 12h.01"/>', stroke: 1.8 },
  shield: { body: '<path d="M12 2.5l8 3v5.8c0 4.8-3.4 8.4-8 10.2-4.6-1.8-8-5.4-8-10.2V5.5z"/><path d="M8.5 12l2.3 2.3 4.7-4.8"/>' },
  megaphone: { body: '<path d="M14 6l6-3v18l-6-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM14 6v12M6 18l1 4h4l-1-4"/>' },
  mouse: { body: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v7M6 10h12"/>' },
  keyboard: { body: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>' },
  clock: { body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>' },
  profiles: {
    body: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
  },
  settings: { body: '<path d="M10.52 5.57L10.75 3.09A9 9 0 0 1 13.25 3.09L13.48 5.57A6.6 6.6 0 0 1 15.5 6.4L17.42 4.81A9 9 0 0 1 19.19 6.58L17.6 8.5A6.6 6.6 0 0 1 18.43 10.52L20.91 10.75A9 9 0 0 1 20.91 13.25L18.43 13.48A6.6 6.6 0 0 1 17.6 15.5L19.19 17.42A9 9 0 0 1 17.42 19.19L15.5 17.6A6.6 6.6 0 0 1 13.48 18.43L13.25 20.91A9 9 0 0 1 10.75 20.91L10.52 18.43A6.6 6.6 0 0 1 8.5 17.6L6.58 19.19A9 9 0 0 1 4.81 17.42L6.4 15.5A6.6 6.6 0 0 1 5.57 13.48L3.09 13.25A9 9 0 0 1 3.09 10.75L5.57 10.52A6.6 6.6 0 0 1 6.4 8.5L4.81 6.58A9 9 0 0 1 6.58 4.81L8.5 6.4A6.6 6.6 0 0 1 10.52 5.57Z"/><circle cx="12" cy="12" r="2.6"/>' },
  plus: { body: '<path d="M12 5v14M5 12h14"/>', stroke: 2 },
  search: { body: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>' },
  chevron: { body: '<path d="M6 9l6 6 6-6"/>', stroke: 1.8 },
  chevrons: { body: '<path d="M8 10l4-4 4 4M8 14l4 4 4-4"/>', stroke: 1.8 },
  play: {
    body: '<path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.6-6.8c.6-.4.6-1.4 0-1.8L9.6 4.3C8.9 3.9 8 4.4 8 5.2z"/>',
  },
  stop: { body: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>' },
  spinner: { body: '<path d="M12 4a8 8 0 1 1-8 8"/>', stroke: 2.4 },
  more: { body: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>', filled: true },
  refresh: { body: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>' },
  check: { body: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-5"/>' },
  alert: { body: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4M12 17h.01"/>' },
  download: { body: '<path d="M12 4.5v11M7.5 11L12 15.5 16.5 11M4.5 15.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>' },
  close: { body: '<path d="M6 6l12 12M18 6L6 18"/>' },
  folder: { body: FOLDER },
  moveToFolder: { body: `${FOLDER}<path d="M8.5 13.5h6.5M12.5 11l2.5 2.5-2.5 2.5"/>` },
  cookieExport: { body: '<path d="M18.5 13.5A7.5 7.5 0 1 1 10.5 5.5"/><path d="M7.5 11h.01M8.5 16h.01M13 15h.01"/><path d="M15 3.5h5.5V9M20.5 3.5l-6.5 6.5"/>' },
  /** «Снять выделение» — как полувыбранная галочка шапки таблицы. */
  deselect: { body: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.5 12h7"/>' },
  sortAsc: { body: '<path d="M8 19V5M4.5 8.5L8 5l3.5 3.5M14 7h3M14 12h5M14 17h7"/>' },
  sortDesc: { body: '<path d="M8 5v14M4.5 15.5L8 19l3.5-3.5M14 7h7M14 12h5M14 17h3"/>' },
  upload: { body: '<path d="M12 15.5v-11M7.5 9L12 4.5 16.5 9M4.5 15.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>' },
  columns: { body: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M9.5 5v14M14.5 5v14"/>' },
  prev: { body: '<path d="M15 6l-6 6 6 6"/>', stroke: 1.8 },
  next: { body: '<path d="M9 6l6 6-6 6"/>', stroke: 1.8 },
  info: { body: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>' },
  ring: { body: '<circle cx="12" cy="12" r="7"/>', stroke: 1.9 },
  copy: { body: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5.5 15.5h-1a1 1 0 0 1-1-1v-9a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1"/>' },
  tick: { body: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', stroke: 2 },
  groups: { body: FOLDER },
  proxies: {
    body: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z"/>',
  },
  extensions: { body: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h3v-.5a2.5 2.5 0 0 1 5 0V7H16a1.5 1.5 0 0 1 1.5 1.5V11h.5a2.5 2.5 0 0 1 0 5h-.5v2.5A1.5 1.5 0 0 1 16 20H5.5A1.5 1.5 0 0 1 4 18.5z"/>' },
  automation: { body: '<rect x="4.5" y="8" width="15" height="11.5" rx="3"/><circle cx="12" cy="4.5" r="1.3"/><path d="M12 5.8V8M9.5 12.5v1.5M14.5 12.5v1.5M2.5 12.5v3M21.5 12.5v3"/>' },
  sync: { body: '<path d="M4 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1M8 16H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"/><rect x="10" y="10" width="10" height="10" rx="1"/><path d="M15 2h2a4 4 0 0 1 4 4v5m-2-2 2 2 2-2"/>' },
  trash: {
    body: '<path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7l.8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7M10 11v5M14 11v5"/>',
  },
  edit: { body: '<path d="M4.5 19.5l1-4L16 5a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L8.5 18.5zM14.5 6.5l3 3"/>' },
  external: {
    body: '<path d="M14 5h5v5M19 5l-8 8M11 6.5H7A1.5 1.5 0 0 0 5.5 8v9A1.5 1.5 0 0 0 7 18.5h9a1.5 1.5 0 0 0 1.5-1.5v-4"/>',
    stroke: 1.8,
  },
  star: { body: '<path d="M12 4l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>' },
  starFilled: { body: '<path d="M12 4l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>', filled: true },
  panelCollapse: { body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M16 9l-3 3 3 3"/>' },
  panelExpand: { body: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M14 9l3 3-3 3"/>' },
  selectArea: { body: '<path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M4 12h.01M12 4h.01M20 12h.01M12 20h.01"/>' },
  hand: { body: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6 7h-1c-2 0-3.5-1-4.5-2.5l-4-6A1.5 1.5 0 0 1 7 11.5L8 13"/>' },
  groupNodes: { body: '<rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="13" width="4" height="4" rx="1"/><path d="M11 9h4v4"/>' },
  ungroupNodes: { body: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="13" width="4" height="4" rx="1"/>' },
  undo: { body: '<path d="M8 5L3.5 9.5 8 14M4 9.5h9a6 6 0 0 1 6 6v3"/>' },
  redo: { body: '<path d="M16 5l4.5 4.5L16 14M20 9.5h-9a6 6 0 0 0-6 6v3"/>' },
  alignNodes: { body: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="16" y="7" width="5" height="10" rx="1"/><path d="M10 12h4M12 3v6M12 15v6"/>' },
  journal: { body: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>' },
  save: { body: '<path d="M5 3.5h12l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M7.5 3.5v6h9v-6M7.5 20.5v-7h9v7"/>' },
  paste: { body: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 12h8M8 16h5"/>' },
}
