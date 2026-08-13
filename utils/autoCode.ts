  export const autoCode = (name: string) => {
    const prefix = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    return prefix + Date.now().toString().slice(-4);
  };