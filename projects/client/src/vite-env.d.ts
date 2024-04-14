/// <reference types="vite/client" />

interface ImportMetaEnv {
	// SERVER
	readonly VITE_SERVER_ENDPOINT: string;
	readonly VITE_GEOAPIFY_API_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
