// src/services/imageGeneration.ts
import { IMAGE_GEN_REST_URL } from '../config';

const API_BASE_URL = IMAGE_GEN_REST_URL;

// Export interfaces
export interface GenerateImageRequest {
  image: string; // base64 string
  prompt?: string;
  strength?: number;
  guidance_scale?: number;
}

export interface GenerateBatchRequest {
  image: string;
  prompt?: string;
  num_variations?: number;
  strength?: number;
}

export interface GeneratedImage {
  id?: number;
  prompt?: string;
  image: string; // base64 string
  score?: number;
  type?: string;
  title?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Regular exports (values)
export const imageGenerationAPI = {
  // Health check
  async checkHealth(): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  // Single image generation
  async generateImage(data: GenerateImageRequest): Promise<ApiResponse<{ generated_image: string }>> {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: data.image,
        prompt: data.prompt || 'Professional product advertisement, high quality, commercial photography',
        strength: data.strength || 0.8,
        guidance_scale: data.guidance_scale || 7.5,
      }),
    });

    return response.json();
  },

  // Batch generation
  async generateBatch(data: GenerateBatchRequest): Promise<ApiResponse<{ variations: GeneratedImage[] }>> {
    const response = await fetch(`${API_BASE_URL}/generate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: data.image,
        prompt: data.prompt || 'Professional product advertisement',
        num_variations: data.num_variations || 3,
        strength: data.strength || 0.7,
      }),
    });

    return response.json();
  },

  // Upload image file
  async uploadImage(file: File): Promise<ApiResponse<{ image_base64: string }>> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  },
};