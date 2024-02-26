import { PhotoProps } from "../types";

export const Photo = ({ src, width, height }: PhotoProps) => (
  <img src={`/img/photos/${src}`} alt={src} width={width} height={height} />
);
