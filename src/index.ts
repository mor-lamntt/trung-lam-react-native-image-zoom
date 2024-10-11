export { default as ImageZoom } from './components/ImageZoom';
export { default as Zoomable } from './components/Zoomable';
export * from './types';

export function clamp(num: number, min: number, max: number) {
  return num <= min ? min : num >= max ? max : num;
}
