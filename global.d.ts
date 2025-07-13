// Global type declarations

// Allow importing CSS files in TS/TSX modules
declare module "*.css" {
  const content: { [className: string]: string } | string;
  export default content;
}

// Specific declaration for Mapbox GL's bundled CSS used via side-effect import
declare module "mapbox-gl/dist/mapbox-gl.css" {
  const content: string;
  export default content;
}