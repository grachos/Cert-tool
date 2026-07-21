export const colors = {
  brand: { primary: '#2563eb', primaryHover: '#1d4ed8', primaryLight: '#eff6ff' },
  bg: { page: '#f8fafc', secondary: '#f1f5f9', card: '#ffffff', sidebar: '#ffffff', surface1: '#f1f5f9', surface2: '#e2e8f0' },
  text: { primary: '#0f172a', secondary: '#475569', muted: '#64748b', inverse: '#ffffff' },
  status: { success: '#16a34a', successBg: '#dcfce7', error: '#dc2626', errorBg: '#fee2e2', warning: '#d97706', warningBg: '#fef3c7', info: '#2563eb', infoBg: '#eff6ff' },
  border: { light: '#e2e8f0', medium: '#cbd5e1', dark: '#475569' },
};

export const darkColors = {
  brand: { ...colors.brand, primaryLight: 'rgba(37,99,235,0.15)' },
  bg: { page: '#0f172a', secondary: '#1e293b', card: '#1e293b', sidebar: '#0f172a', surface1: '#1e293b', surface2: '#334155' },
  text: { primary: '#f8fafc', secondary: '#cbd5e1', muted: '#94a3b8', inverse: '#0f172a' },
  status: colors.status,
  border: { light: '#334155', medium: '#475569', dark: '#64748b' },
};
