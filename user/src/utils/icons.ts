// 统一图标注册表 - SVG data URI 格式
function svg(content: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`)}`
}
function svgFill(content: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${content}</svg>`)}`
}

export const ICONS = {
    search: svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
    bell: svg('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
    robot: svgFill('<rect x="3" y="8" width="18" height="12" rx="2" fill="#555"/><rect x="8" y="4" width="8" height="5" rx="1" fill="#555"/><circle cx="9" cy="14" r="2" fill="#fff"/><circle cx="15" cy="14" r="2" fill="#fff"/><line x1="12" y1="4" x2="12" y2="8" stroke="#555" stroke-width="2"/><circle cx="12" cy="3" r="1.5" fill="#555"/>'),
    star: svgFill('<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#faad14"/>'),
    locate: svgFill('<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ff4d4f"/><circle cx="12" cy="9" r="2.5" fill="#fff"/>'),
    heatmap: svgFill('<path d="M12 2c0 0-6 5.5-6 10a6 6 0 0 0 12 0c0-4.5-6-10-6-10z" fill="#ff6b35"/><path d="M12 8c0 0-3 3-3 5.5a3 3 0 0 0 6 0C15 11 12 8 12 8z" fill="#ffcc00"/>'),
    mic: svg('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'),
    stop: svgFill('<rect x="3" y="3" width="18" height="18" rx="2" fill="#ff4d4f"/>'),
    loading: svg('<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    satellite: svgFill('<path d="M2 12L7 7l5 5-5 5-5-5z" fill="#1890FF"/><path d="M12 2l5 5-5 5-5-5 5-5z" fill="#52C41A"/><circle cx="17" cy="17" r="3" fill="#faad14"/><line x1="14" y1="14" x2="20" y2="20" stroke="#faad14" stroke-width="1.5"/>'),
    route: svg('<polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>'),
    ticket: svgFill('<path d="M2 9a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4V9z" fill="#722ed1"/>'),
    phone: svgFill('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" fill="#52C41A"/>'),
    share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>'),
    navigate: svgFill('<polygon points="3,11 22,2 13,21 11,13" fill="#1890FF"/>'),
    checkin: svgFill('<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#52C41A"/><polyline points="9,9 11,11 15,7" stroke="#fff" stroke-width="2" fill="none"/>'),
    checkedIn: svgFill('<circle cx="12" cy="12" r="10" fill="#52C41A"/><polyline points="9,12 11,14 15,10" stroke="#fff" stroke-width="2.5" fill="none"/>'),
    edit: svg('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),
} as const


export const MSG_ICONS = {
    'msg-system': svgFill('<path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10h5l3 3v-3.5c1.24-1.5 2-3.4 2-5.5z" fill="#1890FF"/><line x1="8" y1="10" x2="16" y2="10" stroke="#fff" stroke-width="1.5"/><line x1="8" y1="14" x2="13" y2="14" stroke="#fff" stroke-width="1.5"/>'),
    'msg-route': svg('<polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>'),
    'msg-comment': svgFill('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#faad14"/>'),
    'msg-activity': svgFill('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#ff4d4f"/>'),
    'msg-default': svgFill('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#999"/><polyline points="22,6 12,13 2,6" stroke="#fff" stroke-width="1.5" fill="none"/>'),
} as const

export const NAT_ICONS = {
    'nat-city': svgFill('<rect x="2" y="10" width="20" height="12" fill="#1890FF" rx="1"/><rect x="6" y="6" width="12" height="6" fill="#40a9ff" rx="1"/><rect x="9" y="2" width="6" height="5" fill="#69c0ff" rx="1"/><rect x="5" y="13" width="3" height="4" fill="#fff"/><rect x="11" y="13" width="3" height="4" fill="#fff"/><rect x="16" y="13" width="3" height="4" fill="#fff"/>'),
    'nat-cn': svgFill('<rect width="24" height="24" rx="3" fill="#de2910"/><polygon points="5,4 6.5,8.5 2,6 8,6 3.5,8.5" fill="#ffde00"/>'),
    'nat-jp': svgFill('<rect width="24" height="24" rx="3" fill="#fff" stroke="#eee" stroke-width="1"/><circle cx="12" cy="12" r="5" fill="#bc002d"/>'),
    'nat-kr': svgFill('<rect width="24" height="24" rx="3" fill="#fff" stroke="#eee" stroke-width="1"/><circle cx="12" cy="12" r="4" fill="none" stroke="#cd2e3a" stroke-width="2.5"/><circle cx="12" cy="12" r="2" fill="#0047a0"/>'),
    'nat-us': svgFill('<rect width="24" height="24" rx="3" fill="#b22234"/><rect y="4" width="24" height="2" fill="#fff"/><rect y="8" width="24" height="2" fill="#fff"/><rect y="12" width="24" height="2" fill="#fff"/><rect y="16" width="24" height="2" fill="#fff"/><rect y="20" width="24" height="2" fill="#fff"/><rect width="10" height="12" rx="3" fill="#3c3b6e"/>'),
    'nat-other': svgFill('<circle cx="12" cy="12" r="10" fill="#52C41A"/><ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#fff" stroke-width="1.5"/><line x1="2" y1="12" x2="22" y2="12" stroke="#fff" stroke-width="1.5"/>'),
} as const

export const INTENSITY_ICONS = {
    'intensity-easy': svgFill('<circle cx="12" cy="5" r="2" fill="#52C41A"/><path d="M12 7v6l-3 3" stroke="#52C41A" stroke-width="2" fill="none"/><path d="M12 13l3 3" stroke="#52C41A" stroke-width="2" fill="none"/><line x1="9" y1="10" x2="15" y2="10" stroke="#52C41A" stroke-width="2"/>'),
    'intensity-moderate': svgFill('<circle cx="12" cy="4" r="2" fill="#1890FF"/><path d="M12 6v5" stroke="#1890FF" stroke-width="2"/><path d="M8 8l4 3 4-3" stroke="#1890FF" stroke-width="2" fill="none"/><path d="M10 11l-2 5" stroke="#1890FF" stroke-width="2"/><path d="M14 11l2 5" stroke="#1890FF" stroke-width="2"/><circle cx="8" cy="17" r="2" fill="#1890FF"/><circle cx="16" cy="17" r="2" fill="#1890FF"/>'),
    'intensity-intensive': svgFill('<circle cx="12" cy="4" r="2" fill="#ff4d4f"/><path d="M12 6l-2 4 2 2 2-2-2-4z" fill="#ff4d4f"/><path d="M10 10l-3 6" stroke="#ff4d4f" stroke-width="2"/><path d="M14 10l3 6" stroke="#ff4d4f" stroke-width="2"/>'),
} as const

export const INTEREST_ICONS = {
    'interest-history': svg('<rect x="3" y="10" width="18" height="11" rx="1"/><path d="M3 10l9-7 9 7"/><line x1="9" y1="21" x2="9" y2="14"/><line x1="15" y1="21" x2="15" y2="14"/>'),
    'interest-nature': svgFill('<path d="M12 2C6 2 2 8 2 12c0 5.5 4.5 10 10 10s10-4.5 10-10C22 8 18 2 12 2z" fill="#52C41A"/><path d="M12 22V12" stroke="#fff" stroke-width="1.5"/><path d="M12 12C12 12 7 8 7 5" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M12 12C12 12 17 8 17 5" stroke="#fff" stroke-width="1.5" fill="none"/>'),
    'interest-food': svgFill('<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#fa8c16" stroke-width="2" fill="none"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="#fa8c16"/>'),
    'interest-coffee': svgFill('<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#795548" stroke-width="2" fill="none"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="#795548"/>'),
    'interest-art': svgFill('<circle cx="12" cy="12" r="10" fill="#722ed1"/><circle cx="8" cy="10" r="1.5" fill="#fff"/><circle cx="12" cy="8" r="1.5" fill="#fff"/><circle cx="16" cy="10" r="1.5" fill="#fff"/><circle cx="16" cy="14" r="1.5" fill="#fff"/><circle cx="12" cy="16" r="1.5" fill="#fff"/><circle cx="8" cy="14" r="1.5" fill="#fff"/>'),
    'interest-shopping': svgFill('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="#eb2f96"/><line x1="3" y1="6" x2="21" y2="6" stroke="#fff" stroke-width="1.5"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#fff" stroke-width="1.5" fill="none"/>'),
    'interest-photography': svgFill('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="#1890FF"/><circle cx="12" cy="13" r="4" fill="#fff"/>'),
    'interest-nightlife': svgFill('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#1a1a2e"/><circle cx="15" cy="6" r="1" fill="#faad14"/><circle cx="18" cy="10" r="0.8" fill="#faad14"/>'),
} as const

export const CAT_ICONS = {
    'cat-all': svg('<polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>'),
    'cat-scenic': svgFill('<rect x="3" y="10" width="18" height="11" rx="1" fill="#1890FF"/><path d="M3 10l9-7 9 7" stroke="#1890FF" stroke-width="2" fill="none"/><rect x="9" y="14" width="6" height="7" fill="#fff"/>'),
    'cat-museum': svgFill('<ellipse cx="12" cy="8" rx="8" ry="4" fill="#722ed1"/><rect x="4" y="8" width="16" height="2" fill="#722ed1"/><rect x="5" y="10" width="2" height="8" fill="#9254de"/><rect x="11" y="10" width="2" height="8" fill="#9254de"/><rect x="17" y="10" width="2" height="8" fill="#9254de"/><rect x="4" y="18" width="16" height="2" fill="#722ed1"/>'),
    'cat-park': svgFill('<path d="M12 2l4 8H8l4-8z" fill="#52C41A"/><path d="M8 8l5 10H3L8 8z" fill="#73d13d"/><path d="M16 8l5 10H11l5-10z" fill="#73d13d"/><rect x="11" y="18" width="2" height="4" fill="#795548"/>'),
    'cat-food': svgFill('<path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#fa8c16" stroke-width="2" fill="none"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="#fa8c16"/>'),
    'cat-shopping': svgFill('<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="#eb2f96"/><line x1="3" y1="6" x2="21" y2="6" stroke="#fff" stroke-width="1.5"/><path d="M16 10a4 4 0 0 1-8 0" stroke="#fff" stroke-width="1.5" fill="none"/>'),
} as const

export const EXTRA_ICONS = {
    cat: svgFill('<path d="M4 6C4 3.8 5.8 2 8 2l1 2 6 0 1-2c2.2 0 4 1.8 4 4v8c0 3.3-2.7 6-6 6h-4C6.7 22 4 19.3 4 16V6z" fill="#ffcc80"/><circle cx="9" cy="10" r="1.5" fill="#333"/><circle cx="15" cy="10" r="1.5" fill="#333"/><path d="M10 14c0.5 1 3.5 1 4 0" stroke="#333" stroke-width="1" fill="none"/><path d="M4 6L2 3" stroke="#ffcc80" stroke-width="2"/><path d="M20 6L22 3" stroke="#ffcc80" stroke-width="2"/>'),
} as const

// 合并所有图标为统一注册表
export const ALL_ICONS = {
    ...ICONS,
    ...MSG_ICONS,
    ...NAT_ICONS,
    ...INTENSITY_ICONS,
    ...INTEREST_ICONS,
    ...CAT_ICONS,
    ...EXTRA_ICONS,
} as const

export type IconName = keyof typeof ALL_ICONS
