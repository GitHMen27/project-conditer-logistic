export interface Hub {
  id: string;
  name: string;
  type: 'factory' | 'warehouse' | 'store';
  coords: [number, number];
  websiteUrl?: string;
  adminUrl?: string;
}

export const HUBS: Hub[] = [
  {
    id: 'hub-1',
    name: 'Главная Кондитерская Фабрика',
    type: 'factory',
    coords: [55.751244, 37.618423],
    websiteUrl: 'https://example.com/factory',
    adminUrl: '/admin/hubs/factory-1',
  },
  {
    id: 'hub-2',
    name: 'Распределительный Центр «Север»',
    type: 'warehouse',
    coords: [55.831244, 37.518423],
    websiteUrl: 'https://example.com/hubs/north',
    adminUrl: '/admin/hubs/north-wh',
  },
  {
    id: 'hub-3',
    name: 'Филиал «Западный»',
    type: 'store',
    coords: [55.731244, 37.418423],
    websiteUrl: 'https://example.com/stores/west',
    adminUrl: '/admin/hubs/west-store',
  },
  {
    id: 'hub-4',
    name: 'Филиал «Восточный»',
    type: 'store',
    coords: [55.761244, 37.758423],
    websiteUrl: 'https://example.com/stores/east',
    adminUrl: '/admin/hubs/east-store',
  },
];