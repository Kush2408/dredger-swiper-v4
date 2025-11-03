import axios from "axios";

// Environment configuration with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.10.251:8001/api/v1';

const api = axios.create({
	baseURL: API_BASE_URL,
});

export type EnginePropulsionResponse = unknown; // replace with real shape when available

export const getEnginePropulsion = async (): Promise<EnginePropulsionResponse> => {
	const { data } = await api.get("/engine-propulsion");
	return data;
};

// Engine service with SSE support
export const engineService = {
	async getEnginePropulsion(): Promise<EnginePropulsionResponse> {
		const { data } = await api.get("/engine-propulsion");
		return data;
	},

	// Get SSE URL for real-time engine propulsion data
	getSSEUrl(): string {
		return `${API_BASE_URL}/engine-propulsion`;
	},
};