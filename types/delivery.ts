export interface ActiveTruck {
  id: string;
  fromHubId: string;
  toHubId: string;
  route: [number, number][];
  currentPosition: [number, number];
  progress: number;
  duration: number;
  startTime: number;
  isUserOrder?: boolean;
}