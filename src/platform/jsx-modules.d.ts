declare module "*.jsx" {
  const component: any;
  export default component;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_LOCAL_REVIEW_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
