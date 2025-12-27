// CSS Module Type Declarations
declare module '*.css' {
  const content: string;
  export default content;
}

// Image Asset Type Declarations  
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_PRESENCE_URL?: string;
  readonly VITE_WS_PRESENCE_PATH?: string;
  readonly VITE_DEBUG_WS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
