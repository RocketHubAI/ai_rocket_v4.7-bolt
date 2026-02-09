export interface N8NTemplate {
  id: number;
  name: string;
  description: string;
  workflow: {
    nodes: any[];
    connections: any;
  };
  nodes: Array<{
    displayName: string;
    name: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
  }>;
  createdAt: string;
  views: number;
  user: {
    username: string;
  };
}

export interface N8NCategory {
  id: number;
  name: string;
  icon?: string;
  subcategories?: N8NCategory[];
}

export interface TemplateSearchParams {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

class N8NTemplatesService {
  private baseUrl = 'https://api.n8n.io/templates';

  async searchTemplates(params: TemplateSearchParams = {}): Promise<{
    workflows: N8NTemplate[];
    totalWorkflows: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params.query) {
      searchParams.append('search', params.query);
    }

    if (params.category) {
      searchParams.append('categories', params.category);
    }

    if (params.limit) {
      searchParams.append('limit', params.limit.toString());
    } else {
      searchParams.append('limit', '20');
    }

    if (params.offset) {
      searchParams.append('offset', params.offset.toString());
    }

    const url = `${this.baseUrl}/search?${searchParams.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Template search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        workflows: data.workflows || [],
        totalWorkflows: data.totalWorkflows || 0,
      };
    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  }

  async getCategories(): Promise<N8NCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/categories`);

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getTemplateById(id: number): Promise<N8NTemplate | null> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  async getPopularTemplates(limit: number = 10): Promise<N8NTemplate[]> {
    try {
      const response = await this.searchTemplates({ limit });
      return response.workflows;
    } catch (error) {
      console.error('Error fetching popular templates:', error);
      return [];
    }
  }

  async searchByCategory(categoryName: string, limit: number = 20): Promise<N8NTemplate[]> {
    try {
      const response = await this.searchTemplates({
        category: categoryName,
        limit
      });
      return response.workflows;
    } catch (error) {
      console.error('Error searching by category:', error);
      return [];
    }
  }

  getCategoryIcon(categoryName: string): string {
    const icons: Record<string, string> = {
      'AI': '✨',
      'Document Ops': '📄',
      'IT Ops': '💻',
      'Marketing': '📣',
      'Sales': '🤝',
      'Support': '💬',
      'Other': '💎',
    };
    return icons[categoryName] || '📋';
  }
}

export const n8nTemplatesService = new N8NTemplatesService();
