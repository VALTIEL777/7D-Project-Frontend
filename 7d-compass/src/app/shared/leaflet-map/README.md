# Leaflet Map Component

A reusable Angular component for displaying interactive maps using Leaflet.js.

## Features

- Interactive map with zoom and pan controls
- Route visualization with polylines
- Custom markers for locations
- Route type filtering
- Individual route visibility control
- Click event handling
- Responsive design
- No routes overlay when no data is available

## Installation

The component requires Leaflet.js to be installed:

```bash
npm install leaflet @types/leaflet
```

## Usage

### Basic Usage

```html
<app-leaflet-map
  [routes]="routes"
  [config]="mapConfig"
  [showMarkers]="true"
  [showPolylines]="true"
  [height]="'400px'"
  [width]="'100%'">
</app-leaflet-map>
```

### Advanced Usage with Event Handling

```html
<app-leaflet-map
  [routes]="routes"
  [config]="mapConfig"
  [showMarkers]="true"
  [showPolylines]="true"
  [height]="'500px'"
  [width]="'100%'"
  [visibleRoutes]="visibleRoutes"
  [routeTypeVisibility]="routeTypeVisibility"
  (markerClick)="onMarkerClick($event)"
  (routeClick)="onRouteClick($event)"
  (mapClick)="onMapClick($event)">
</app-leaflet-map>
```

## Input Properties

### `routes: RouteData[]`
Array of route data to display on the map.

```typescript
interface RouteData {
  routeId: number;
  routeCode: string;
  type: string;
  encodedPolyline: string;
  tickets: Array<{
    ticketId: number;
    address: string;
    queue: number;
  }>;
  color?: string;
}
```

### `config: MapConfig`
Map configuration object.

```typescript
interface MapConfig {
  center: [number, number];  // [latitude, longitude]
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  tileLayer?: string;
  attribution?: string;
}
```

### `showMarkers: boolean`
Whether to show markers for route stops. Default: `true`

### `showPolylines: boolean`
Whether to show route polylines. Default: `true`

### `height: string`
Map container height. Default: `'600px'`

### `width: string`
Map container width. Default: `'100%'`

### `visibleRoutes: Set<number>`
Set of route IDs that should be visible on the map.

### `routeTypeVisibility: { [key: string]: boolean }`
Object controlling visibility of different route types.

## Output Events

### `markerClick: EventEmitter<any>`
Emitted when a marker is clicked.

### `routeClick: EventEmitter<RouteData>`
Emitted when a route polyline is clicked.

### `mapClick: EventEmitter<L.LatLng>`
Emitted when the map is clicked.

## Example Implementation

```typescript
import { Component } from '@angular/core';
import { RouteData, MapConfig } from '../../shared/leaflet-map';

@Component({
  selector: 'app-route-viewer',
  template: `
    <app-leaflet-map
      [routes]="routes"
      [config]="mapConfig"
      [visibleRoutes]="visibleRoutes"
      (markerClick)="onMarkerClick($event)"
      (routeClick)="onRouteClick($event)">
    </app-leaflet-map>
  `
})
export class RouteViewerComponent {
  routes: RouteData[] = [];
  visibleRoutes = new Set<number>();
  
  mapConfig: MapConfig = {
    center: [41.8781, -87.6298], // Chicago
    zoom: 11,
    minZoom: 8,
    maxZoom: 18,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  };

  onMarkerClick(event: any) {
    console.log('Marker clicked:', event);
  }

  onRouteClick(route: RouteData) {
    console.log('Route clicked:', route);
  }
}
```

## Route Colors

The component automatically assigns colors to different route types:

- **SPOTTER**: Red-orange (`#FF4500`)
- **CONCRETE**: Blue (`#4A90E2`)
- **ASPHALT**: Dark green (`#228B22`)

## Customization

### Custom Tile Layers

You can use different tile providers by changing the `tileLayer` in the config:

```typescript
// OpenStreetMap (default)
tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

// CartoDB
tileLayer: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

// Stamen
tileLayer: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png'
```

### Custom Markers

The component uses custom div icons for markers. You can customize the marker appearance by modifying the CSS in the component's SCSS file.

## Dependencies

- Leaflet.js 1.9.4+
- Angular 15+
- TypeScript 4.8+

## Browser Support

The component supports all modern browsers that Leaflet.js supports:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+ 
